import { Component } from '@angular/core';
import { ViewController, NavController, NavParams } from 'ionic-angular';
import {CouchDbServiceProvider} from "../../providers/couch-db-service/couch-db-service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {GlobalFunctionsServiceProvider} from "../../providers/global-functions-service/global-functions-service";


@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  private loginInfo: FormGroup;
  private contactEmail : string = "";
  // private credentials = {
  //   'account': 'migraineTest',
  //   'password': 'test'
  // };

  constructor(public navCtrl: NavController, public navParams: NavParams,
              public couchDbService: CouchDbServiceProvider, private globalFuns: GlobalFunctionsServiceProvider,
              private formBuilder: FormBuilder, public viewCtrl: ViewController) {
    this.contactEmail =globalFuns.getContactEmail();
    this.loginInfo = this.formBuilder.group({
      account: ['', Validators.required],
      password: ['', Validators.required],
    });
  }


  login() {
    this.couchDbService.login(this.loginInfo.value).subscribe(() => {
        console.log("logged in");
        this.viewCtrl.dismiss();
      },
      error => {
        console.log(error);
      });
  }




}
