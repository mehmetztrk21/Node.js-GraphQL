import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import Post from "../models/post.js";
import User from "../models/user.js";
import { clearImage } from "../utils/file.js";
const resolver = {
    login: async function ({ email, password }) { //query {login(email:"test@gmail.com", password:"test") {token, userId}}
        const user = await User.findOne({ email: email });
        if (!user) {
            const error = new Error("A user with this email could not be found.");
            error.code = 401;
            throw error;
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error("Wrong password!");
            error.code = 401;
            throw error;
        }
        const token = jwt.sign(
            {
                email: user.email,
                userId: user._id.toString()
            }, "someSuperSecretSecret", { expiresIn: "1h" }
        );
        return { token: token, userId: user._id.toString() };
    },
    createUser: async function (args, req) {  //mutation { createUser(userInput:{email:"test@gmail.com",name:"Mehmet", password:"test"}){_id, email} }
        const errors = [];
        if (!validator.isEmail(args.userInput.email)) {
            errors.push({ message: "E-mail is invalid" });
        }
        if (validator.isEmpty(args.userInput.password) || !validator.isLength(args.userInput.password, { min: 5 })) {
            errors.push({ message: "Password too short!" });
        }
        if (errors.length > 0) {
            const error = new Error("Invalid input.");
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const existingUser = await User.findOne({ email: args.userInput.email });
        if (existingUser) {
            const error = new Error("User exists already!");
            throw error;
        }
        const hashedPw = await bcrypt.hash(args.userInput.password, 12);
        const user = new User({
            email: args.userInput.email,
            name: args.userInput.name,
            password: hashedPw
        });
        const createdUser = await user.save();
        return { ...createdUser._doc, _id: createdUser._id.toString() };
    },
    user: async function (args, req) { //query {user {_id, name, email, status, posts{_id, title, content, imageUrl, createdAt, updatedAt}}}
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("Invalid user.");
            error.code = 401;
            throw error;
        }
        return { ...user._doc, _id: user._id.toString() };
    },
    updateStatus: async function (args, req) { //mutation{updateStatus(status:$status) {_id, status}}
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("Invalid user.");
            error.code = 401;
            throw error;
        }
        user.status = args.status;
        await user.save();
        return { ...user._doc, _id: user._id.toString() };
    },
    createPost: async function (args, req) { //mutation { createPost(postInput:{title:"Test", content:"Test Content", imageUrl:"https://www.google.com"}){_id, title, content, imageUrl, creator{_id, name}} }
        console.log(req.isAuth)
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        const errors = [];
        if (validator.isEmpty(args.postInput.title) || !validator.isLength(args.postInput.title, { min: 5 })) {
            errors.push({ message: "Title is invalid!" });
        }
        if (validator.isEmpty(args.postInput.content) || !validator.isLength(args.postInput.content, { min: 5 })) {
            errors.push({ message: "Content is invalid!" });
        }
        if (errors.length > 0) {
            const error = new Error("Invalid input.");
            error.data = errors;
            error.code = 422;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("Invalid user.");
            error.code = 401;
            throw error;
        }
        const post = new Post({
            title: args.postInput.title,
            content: args.postInput.content,
            imageUrl: "images/" + args.postInput.imageUrl,
            creator: user
        });
        const createPost = await post.save();
        user.posts.push(createPost);
        await user.save();
        return { ...createPost._doc, _id: createPost._id.toString(), createdAt: createPost.createdAt.toISOString(), updatedAt: createPost.updatedAt.toISOString() };
    },
    posts: async function (args, req) { //query {posts {posts{_id, title, content, imageUrl, creator{_id, name}, createdAt, updatedAt}, totalItems}}
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        if (!args.page) {
            args.page = 1;
        }
        if (!args.limit) {
            args.limit = 2;
        }
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find().sort({ createdAt: -1 }).populate("creator").skip((args.page - 1) * args.limit).limit(args.limit);
        return {
            posts: posts.map(p => {
                return { ...p._doc, _id: p._id.toString(), createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() }
            }), totalItems: totalItems
        };
    },
    post: async function (args, req) { //query {post(id:"5f1f1b1b1b1b1b1b1b1b1b1b") {_id, title, content, imageUrl, creator{_id, name}, createdAt, updatedAt}}
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(args.id).populate("creator");
        if (!post) {
            const error = new Error("No post found!");
            error.code = 404;
            throw error;
        }
        return { ...post._doc, _id: post._id.toString(), createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString() };
    },
    updatePost: async function (args, req) { //mutation {updatePost(id:"5f1f1b1b1b1b1b1b1b1b1b1b", postInput:{title:"Test", content:"Test Content", imageUrl:"https://www.google.com"}){_id, title, content, imageUrl, creator{_id, name}, createdAt, updatedAt}}
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(args.id).populate("creator");
        if (!post) {
            const error = new Error("No post found!");
            error.code = 404;
            throw error;
        }
        if (post.creator._id.toString() !== req.userId.toString()) {
            const error = new Error("Not authorized!");
            error.code = 403;
            throw error;
        }
        const errors = [];
        if (validator.isEmpty(args.postInput.title) || !validator.isLength(args.postInput.title, { min: 5 })) {
            errors.push({ message: "Title is invalid!" });
        }
        if (validator.isEmpty(args.postInput.content) || !validator.isLength(args.postInput.content, { min: 5 })) {
            errors.push({ message: "Content is invalid!" });
        }
        if (errors.length > 0) {
            const error = new Error("Invalid input.");
            error.data = errors;
            error.code = 422;
            throw error;
        }
        post.title = args.postInput.title;
        post.content = args.postInput.content;
        if (typeof args.postInput.imageUrl !== "undefined") {
            post.imageUrl = args.postInput.imageUrl;
        }
        const updatedPost = await post.save();
        return { ...updatedPost._doc, _id: updatedPost._id.toString(), createdAt: updatedPost.createdAt.toISOString(), updatedAt: updatedPost.updatedAt.toISOString() };
    },
    deletePost: async function (args, req) { //mutation {deletePost(id:"5f1f1b1b1b1b1b1b1b1b1b1b") {_id, title, content, imageUrl, creator{_id, name}, createdAt, updatedAt}}
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(args.id);
        if (!post) {
            const error = new Error("No post found!");
            error.code = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error("Not authorized!");
            error.code = 403;
            throw error;
        }
        clearImage(post.imageUrl);
        await Post.findByIdAndRemove(args.id);
        const user = await User.findById(req.userId);
        user.posts.pull(args.id);
        await user.save();
        return true;
    }
};
export default resolver;
