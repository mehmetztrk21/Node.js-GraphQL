import User from "../models/user.js";
import bcrypt from "bcryptjs";
import validator from "validator";
import jwt from "jsonwebtoken";
import Post from "../models/post.js";
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
        return { ...createPost._doc, _id: createPost._id.toString(), createdAt: createPost.createdAt.toISOString(), updatedAt: createPost.updatedAt.toISOString() };
    },
    posts: async function (args, req) { //query {posts {posts{_id, title, content, imageUrl, creator{_id, name}, createdAt, updatedAt}, totalItems}}
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        if(!args.page){
            args.page=1;
        }
        if(!args.limit){
            args.limit=2;
        }
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find().sort({ createdAt: -1 }).populate("creator").skip((args.page - 1) * args.limit).limit(args.limit);
       return {posts:posts.map(p=>{
              return {...p._doc, _id:p._id.toString(), createdAt:p.createdAt.toISOString(), updatedAt:p.updatedAt.toISOString()}
       }), totalItems:totalItems};
    }

};
export default resolver;
