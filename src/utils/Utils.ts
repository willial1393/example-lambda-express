import {Request, Response} from "express";
import * as moment from "moment-timezone";

const writtenNumber = require('written-number');
require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));
AWS.config.update({
    accessKeyId: process.env.AWS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const s3 = new AWS.S3();

export function sendError(res: Response, error: any) {
    console.log(error);
    if (error instanceof Error) {
        error = error.message;
    }
    res.status(403).send(error);
}

export function sendSuccess(res: Response, success: any) {
    res.status(200).send(JSON.stringify(success));
}

export function formatDateTime(date: any): string {
    if (!date) {
        return date;
    }
    return moment(date).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
}

export function formatDate(date: any): string {
    if (!date) {
        return date;
    }
    return moment(date).tz('America/Bogota').format('YYYY-MM-DD');
}

export function formatTime(date: any): string {
    if (!date) {
        return date;
    }
    return moment('2020-01-01 ' + date).tz('America/Bogota').format('HH:mm:ss');
}

export function currentMoment() {
    return moment(new Date()).tz('America/Bogota');
}

export function currentDate(): string {
    return moment(new Date()).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
}

export async function paginateQuery(model: any, req: Request, options?: {
    relations?: string,
    modifyEager?: { relation: string, build: any },
    where?: { column: string, operator?: string, value: any } | { column: string, operator?: string, value: any }[],
    includeDeleted?: boolean
}) {
    const columns: string[] = Object.keys(await model.query().first());
    const query = model.query();
    query.orderBy(req.query.orderByColumn || 'id', req.query.orderBy || 'DESC');
    if (options) {
        if (options.relations) {
            query.eager(options.relations);
        }
        if (options.modifyEager) {
            query.modifyEager(options.modifyEager.relation, options.modifyEager.build);
        }
        if (options.where) {
            if (options.where instanceof Array) {
                options.where.forEach(where => {
                    query.where(where.column, where.operator || '=', where.value);
                });
            } else {
                query.where(options.where.column, options.where.operator || '=', options.where.value);
            }
        }
        if (options.includeDeleted) {
            query.includeDeleted();
        }
    }
    if (!req.query) {
        return query.page();
    }
    if (req.query.search) {
        query.where((queryBuilder: any) => {
            columns.forEach(value => queryBuilder.orWhere(value, 'like', '%' + req.query.search + '%'));
        });
    }
    Object.keys(req.query).forEach(value => {
        const noLike = value.indexOf('.noLike') >= 0;
        if (value !== 'search' && value !== 'orderByColumn' && value !== 'orderBy' && value !== 'limit' && value !== 'page' && req.query[value].length > 0) {
            if (req.query[value] !== 'notNull' && req.query[value] !== 'isNull') {
                query.where(
                    noLike ? value.replace('.noLike', '') : value,
                    noLike ? '=' : 'like',
                    noLike ? req.query[value] : ('%' + req.query[value] + '%')
                );
            } else {
                if (req.query[value] === 'isNull') {
                    query.whereNull(noLike ? value.replace('.noLike', '') : value);
                } else {
                    query.whereNotNull(noLike ? value.replace('.noLike', '') : value);
                }
            }
        }
    });
    return query.page(req.query.page - 1, req.query.limit);
}

export function base64MimeType(encoded: string) {
    let mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
    if (mime && mime.length) {
        return mime[1];
    }
    return null;
}

export function uploadFileS3(options: { dir: string, filename: string, base64: string }): Promise<{ location: any, name: any, mimeType: string | null }> {
    const base64Data = Buffer.from(
        options.base64.substring(options.base64.indexOf('base64') + 7, options.base64.length),
        'base64'
    );
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: options.dir + '/' + options.filename,
        Body: base64Data,
        ACL: 'public-read',
        ContentEncoding: 'base64',
        ContentType: base64MimeType(options.base64)
    };
    return new Promise(async (resolve, reject) => {
        try {
            const {Location, Key} = await s3.upload(params).promise();
            resolve({
                location: Location,
                name: Key.replace(options.dir + '/', ''),
                mimeType: base64MimeType(options.base64)
            });
        } catch (e) {
            reject(e);
        }
    });
}

export function deleteFileS3(location: string): Promise<any> {
    if (location) {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: location.substring(location.indexOf('.amazonaws.com/') + 15, location.length),
        };
        return new Promise<any>((resolve, reject) => {
            s3.deleteObject(params, function (err: any, data: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }
    return new Promise<any>(resolve => resolve('ok'));
}

export function getAbsolutePathOfRelative(relativePath?: string): string {
    let projectRoot = process.cwd();
    projectRoot = projectRoot.replace(/\\/g, '/');
    return 'file:///' + projectRoot + '/' + (relativePath || '');
}

export function numberToWords(number: number | string, language: 'es' | 'en'): string {
    return writtenNumber(Number(number), {lang: language}).toUpperCase();
}
