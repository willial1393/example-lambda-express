import {Request, Response} from "express";
import {Model, Transaction} from "objection";
import {Users} from "../models/users";
import {paginateQuery, sendError, sendSuccess} from "../utils/Utils";

const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const {transaction} = require('objection');

export class UserRouter {
    static get() {
        router.get('/', async function (req: Request, res: Response) {
            try {
                sendSuccess(res, await paginateQuery(Users, req));
            } catch (e) {
                sendError(res, e);
            }
        });
        router.post('/register', async function (req: Request, res: Response) {
            bcrypt.hash(req.body.password, saltRounds, async function (err: any, hash: any) {
                try {
                    const trans = await transaction(Model.knex(), async (trx: Transaction) => {
                        req.body.password = hash;
                        let user: any = await Users.query(trx)
                            .insertAndFetch(req.body);
                        user = await Users.query(trx)
                            .updateAndFetchById(user.id, user);
                        return user;
                    });
                    sendSuccess(res, trans);
                } catch (err) {
                    sendError(res, err);
                }
            });
        });
        router.post('/login', function (req: Request, res: Response) {
            Users.query()
                .where('email', req.body.email)
                .first()
                .then((value: any) => {
                    if (value) {
                        bcrypt.compare(req.body.password, value.password).then(async (value1: any) => {
                            console.log(value1);
                            if (value1) {
                                const token = await jwt.sign(
                                    {data: 'Renapp-admin'},
                                    process.env.PRIVATE_KEY,
                                    {expiresIn: '24h'}
                                );
                                Users.query()
                                    .findById(value.id)
                                    .then((value2: any) => {
                                        value2.token = token;
                                        sendSuccess(res, value2);
                                    });
                            } else {
                                sendError(res, 'Usuario o contraseña incorrecta');
                            }
                        });
                    } else {
                        sendError(res, 'Usuario o contraseña incorrecta');
                    }
                })
                .catch(reason => sendError(res, reason));
        });
        return router;
    }
}
