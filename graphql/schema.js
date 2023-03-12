import { buildSchema } from 'graphql';
const schema = buildSchema(`
    type Post {
        _id:ID!
        title:String!
        content:String!
        imageUrl:String!
        creator:User!
        createdAt:String!
        updatedAt:String!
    }
    type User {
        _id:ID!
        email:String!
        password:String
        name:String!
        posts:[Post!]!
    }
    input PostInputData {
            title:String!
            content:String!
            imageUrl:String!
        }

        input UserInputData {
            email:String!
            password:String!
            name:String!
        }
    type RootMutation {
        createUser(userInput:UserInputData):User!
        createPost(postInput:PostInputData):Post!
    }
    type AuthData {
        token:String!
        userId:String!
    }
    type RootQuery {
        login(email:String, password:String):AuthData!
    }     
    schema {
        query:RootQuery
        mutation:RootMutation
    }
`);
export default schema;