import {Component} from '@angular/core';
import {NavController, NavParams} from 'ionic-angular';
import {CouchDbServiceProvider} from "../../providers/couch-db-service/couch-db-service";
import {GlobalFunctionsServiceProvider} from "../../providers/global-functions-service/global-functions-service";



@Component({
    selector: 'page-debug',
    templateUrl: 'debug-page.html',
})

export class DebugPage {

    constructor(public navCtrl: NavController, public navParams: NavParams,
                public couchDBService: CouchDbServiceProvider,
                public globalFunctionsService: GlobalFunctionsServiceProvider) {
    }

    dbURL = "http://127.0.0.1:5984";

    createDB(dbName) {
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        // dbName =
        console.log(dbName);
        var req = new XMLHttpRequest();
        req.open("PUT", this.dbURL + "/" + "migraine-tracker" + "/doc-1", true);
        req.setRequestHeader("Content-type", "application/json");

        req.send();

        // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        // console.log(dbName);
        // var req = new XMLHttpRequest();
        // req.open("GET", this.dbURL + "/_all_dbs", true);
        // req.setRequestHeader("Content-type", "application/json");
        // req.send();
        console.log(req)
    }

    updateDB(dbName, docName, data) {
        var req = new XMLHttpRequest();
        req.open("PUT", this.dbURL + '/' + dbName + '/' + docName, true);
        req.setRequestHeader("Content-type", "application/json");

        req.send(JSON.stringify(data));
        console.log(req)
    }

}

