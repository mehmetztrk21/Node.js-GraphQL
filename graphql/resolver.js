import User from "../models/user.js";
import bcrypt from "bcryptjs";
import validator from "validator";
const resolver = {
    hello() {
        return {
            text:"Hello World!",
            views:1450
        };
    },
    createUser: async function(args, req) {  //or {userInput}, req
        const errors = [];
        if(!validator.isEmail(args.userInput.email)) {
            errors.push({message: "E-mail is invalid"});
        }
        if(validator.isEmpty(args.userInput.password) || !validator.isLength(args.userInput.password, {min: 5})) {
            errors.push({message: "Password too short!"});
        }
        if(errors.length > 0) {
            const error = new Error("Invalid input.");
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const existingUser = await User.findOne({email: args.userInput.email});
        if(existingUser) {
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
        return {...createdUser._doc, _id: createdUser._id.toString()};
    }

};
export default resolver;
