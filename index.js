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
        const orderCollection = client.db("maxtools").collection("orders");

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

        //    Verify Admin middleware

        const verifyAdmin = async (req, res, next) => {
            const requesterEmail = req.decoded.email;
            const requesterUser = await userCollection.findOne({
                email: requesterEmail,
            });
            if (requesterUser.role === "admin") {
                next();
            } else {
                res.status(403).send({ message: "Forbidden access!" });
            }
        };

        // Put api to add user
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const data = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: data,
            };
            const result = await userCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            const token = jwt.sign(
                { email: email },
                process.env.ACCESS_TOKEN_SECRET
            );
            res.send({ token, result });
        });

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

        // Post api to add product
        app.post("/product", jwtVerify, verifyAdmin, async (req, res) => {
            const data = req.body;
            const result = await productCollection.insertOne(data);
            res.send(result);
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
        // Get api to read one user
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const product = await userCollection.findOne(filter);
            res.send(product);
        });
        // to make admin api 
        app.put("/user/admin/:email", jwtVerify, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: "admin" },
            };
            const requesterEmail = req.decoded.email;
            const requesterUser = await userCollection.findOne({
                email: requesterEmail,
            });
            if (requesterUser.role === "admin") {
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send({ success: true, result });
            } else {
                res.status(403).send({ message: "forbidden" });
            }
        });

        // Post api to add product
        app.post("/order", jwtVerify, async (req, res) => {
            const data = req.body;
            const result = await orderCollection.insertOne(data);
            res.send(result);
        });
        // Patch api to update availableUnit after placing order
        app.patch("/product-available/:id", jwtVerify, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: data,
            };
            const result = await productCollection.updateOne(filter, updateDoc);

            res.send(result);
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