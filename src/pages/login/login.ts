import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavController } from 'ionic-angular';
import { SignUpPage } from "../signup/signup";
import { HomePage } from "../home/home";
import { CouchDbServiceProvider } from "../../providers/couch-db-service/couch-db-service";
import { GlobalFunctionsServiceProvider } from "../../providers/global-functions-service/global-functions-service";
import { Storage } from '@ionic/storage';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {
  private username: string;
  private password: string;
  private usernameError: any;
  private contactEmail : string = "";

  constructor(public nav: NavController,
              public http: HttpClient,
              private globalFuns: GlobalFunctionsServiceProvider,
              public couchDbService: CouchDbServiceProvider,
              private storage: Storage) {
    this.contactEmail = globalFuns.getContactEmail();
  }

  login() {
    let credentials = {
      username: this.username,
      password: this.password
    };
    this.couchDbService.login(credentials).then(response => {
      console.log("Log in as " + credentials['username']);
      this.storage.set('credentials', credentials);
      this.nav.push(HomePage);
    }).catch(err => {
      if (err) {
        if (err.name === 'unauthorized' || err.name === 'forbidden') {
          this.usernameError = "Username or password is incorrect!";
          if (err.message === 'You are not a server admin.') {
            this.usernameError = "Please sign up an account!";
          }
        } else {
          this.usernameError = "Error requesting!";
        }
      }
    });
  }

  launchSignup(){
    this.nav.push(SignUpPage);
  }

  typeUsername() {
    this.usernameError = null;
  }
}
