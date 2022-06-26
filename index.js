const express = require("express");
const cors = require('cors');
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qbuxbv9.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const productCollection = client.db('maxtools').collection('product');
        const reviewCollection = client.db('maxtools').collection('reviews');
        const userCollection = client.db("maxtools").collection("users");

        // Verify JWT middleware
        const jwtVerify = (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: "Unauthorize access!" });
            }
            const token = authHeader.split(" ")[1];
            jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET,
                function (error, decoded) {
                    if (error) {
                        return res.status(403).send({ message: "Forbidden access!" });
                    }
                    req.decoded = decoded;
                    next();
                }
            );
        };
        //read all products
        app.get("/product", async (req, res) => {
            const query = req.query;
            const products = await productCollection
                .find(query)
                .sort({ _id: -1 })
                .toArray();
            res.send(products);
        });
        //one product api
        app.get("/product/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const product = await productCollection.findOne(filter);
            res.send(product);
        });
        // read all reviews
        app.get("/review", async (req, res) => {
            const query = req.query;
            const products = await reviewCollection
                .find(query)
                .sort({ _id: -1 })
                .toArray();
            res.send(products);
        });

        // check admin api
        app.get("/admin/:email", jwtVerify, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user?.role === "admin";

            res.send({ admin: isAdmin });
        });
        //all users api
        app.get("/user", async (req, res) => {
            const query = req.query;
            const cursor = userCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });
        //one user users api
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const product = await userCollection.findOne(filter);
            res.send(product);
        });
    }
    finally {

    }
}
run().catch(console.dir);


//middleware;
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('max tools server running')
});

app.listen(port, () => {
    console.log('server running at', port);
})