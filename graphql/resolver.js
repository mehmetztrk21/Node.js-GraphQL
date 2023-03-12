import User from "../models/user.js";
import bcrypt from "bcryptjs";
const resolver = {
    hello() {
        return {
            text:"Hello World!",
            views:1450
        };
    },
    createUser: async function(args, req) {  //or {userInput}, req
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
