import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { HttpClient } from '@angular/common/http';
import { LoginPage } from "../login/login";
import { CouchDbServiceProvider } from "../../providers/couch-db-service/couch-db-service";
import { Storage } from '@ionic/storage';
import { GlobalFunctionsServiceProvider } from "../../providers/global-functions-service/global-functions-service";
import { HomePage } from "../home/home";

@Component({
  selector: 'page-signup',
  templateUrl: 'signup.html'
})

export class SignUpPage {
  username: string;
  password: string;
  confirmPassword: string;
  usernameError: string;
  loginPage: LoginPage;

  constructor(public nav: NavController,
              public http: HttpClient,
              private globalFuns: GlobalFunctionsServiceProvider,
              public couchDbService: CouchDbServiceProvider,
              private storage: Storage) {
    this.loginPage = new LoginPage(nav, http, globalFuns, couchDbService, storage);
  }

  async signUp() {
    let credentials = {
      username: this.username,
      password: this.password,
    };
    this.couchDbService.signUp(credentials).then(response => {
      this.storage.set('credentials', credentials);
      this.couchDbService.initializeUserInfoDoc(this.username);
      this.nav.push(HomePage);
    }).catch(err => {
      console.log(err);
      if (err.name === 'conflict') {
        this.usernameError = "Username already exists! Please choose another one.";
      } else if (err.name === 'forbidden') {
        this.usernameError = "Username is invalid! Please choose another one.";
      } else {
        if (err.message === 'You must provide a username') {
          this.usernameError = "You must provide a username!";
        } else if (err.message === 'You must provide a password') {
          this.usernameError = "You must provide a password!";
        }
        else {
          this.usernameError = "Error connecting. Please try again later.";
        }
      }
    });
  }

  onCloseClick() {
    this.nav.popToRoot();
  }

  typeUsername() {
    this.usernameError = null;
  }
}
