import {Model} from "objection";
import {formatDate} from "../utils/Utils";

export class Users extends Model {

    static get tableName() {
        return 'users';
    }

    static get softDelete() {
        return true;
    }

    $formatDatabaseJson(db: any) {
        db = super.$formatDatabaseJson(db);
        delete db.deleted;
        delete db.created;
        delete db.updated;
        delete db.fullname;
        return db;
    }

    $parseDatabaseJson(json: any) {
        json = super.$parseDatabaseJson(json);
        json.fullname = json.firstname + ' ' + json.lastname;
        json.created = formatDate(json.created);
        json.updated = formatDate(json.updated);
        delete json.deleted;
        return json;
    }
}
