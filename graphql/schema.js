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

        input UserInputData {
            email:String!
            password:String!
            name:String!
        }
    type RootMutation {
        createUser(userInput:UserInputData):User!
    }
    type TestData {
        text:String!
        views:Int!
    }
    type RootQuery {
        hello:TestData!
    }     
    schema {
        query:RootQuery
        mutation:RootMutation
    }
`);
export default schema;