import * as Objection from "objection";
import {UserRouter} from "./routers/userRouter";

const express = require('express');
const serverless = require('serverless-http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bodyParser = require('body-parser');
const {Model} = require('objection');
const Knex = require('knex');
const knex = Knex({
    client: 'mysql2',
    useNullAsDefault: true,
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        port: process.env.DB_PORT,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    }
});
Model.knex(knex);
const app = express();
const objectionSoftDelete = require('objection-softdelete');
objectionSoftDelete.register(Objection, {deleteAttr: 'deleted'});
app.use(bodyParser.json({limit: '20mb', extended: true}));
app.use((request, res, next) => {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Access-Token, Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Request-Headers', 'Access-Token, Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});
app.use(async (req, res, next) => {
    console.log('http://localhost:' + process.env.PORT + req.originalUrl);
    if (req.method === 'OPTIONS'
        || req.originalUrl === '/'
        || req.originalUrl === '/user/login'
        || req.originalUrl === '/user/register') {
        return next();
    } else {
        try {
            const token = req.headers['access-token'];
            await jwt.verify(token, process.env.PRIVATE_KEY);
            next();
        } catch (err) {
            res.status(401).send(err);
        }
    }
});
app.get('/', function (req, res) {
    res.send('Success!!! Renapp-admin API');
});
app.use('/user', UserRouter.get());
app.listen(process.env.PORT, function () {
    console.log('listen on http://localhost:' + process.env.PORT);
});
module.exports.handler = serverless(app);
