import { Component } from '@angular/core';
import { HttpClient , HttpHeaders} from '@angular/common/http';
import { NavController } from 'ionic-angular';
import { SignUpPage } from "../signup/signup";
import { HomePage } from "../home/home";
import { CouchDbServiceProvider } from "../../providers/couch-db-service/couch-db-service";
import { GlobalFunctionsServiceProvider } from "../../providers/global-functions-service/global-functions-service";
import { Storage } from '@ionic/storage';
import { Injectable } from '@angular/core'; //YSS

@Injectable() //YSS
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {
  private displayLogin: any = false;
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
    
    /**** YSS GET REQUEST TEST ****/
    console.log('YSS tests new db with GET')
    //let get_url = 'https://b9c6a1ec-b33d-467d-99b7-63e02c7bb018.mock.pstmn.io/test' // the mock server does not have any headers in its response and the get request is successful
    let get_url = 'https://tractdb.org/';  
    
    /* None of these headers worked */
    // let get_headers1 = new HttpHeaders()
    // get_headers1 = get_headers1.set('Accept', '*/*');
    // get_headers1 = get_headers1.set('Content-Type','text/plain')
    // console.log('YSS GET headers 1', JSON.stringify(get_headers1))
    // let get_headers2 = new HttpHeaders({
    //  'Accept': '*/*',
    //  'Content-Type': 'text/plain'
    // })
    // console.log('YSS GET headers 2', JSON.stringify(get_headers2))
    // let get_headers3 = new HttpHeaders()
    // get_headers3 = get_headers3.append('Accept', '*/*');
    // get_headers3 = get_headers3.append('Content-Type', 'text/plain');
    // console.log('YSS GET headers 3', JSON.stringify(get_headers3))
    
    this.http.get(get_url, {observe: 'body', responseType: 'text'})
    .subscribe({
      next: data => {
          console.log('YSS GET success', JSON.stringify(data))
      },
      error: error => {
          console.error('YSS GET error', JSON.stringify(error))
      }
    })
    // {observe: 'body', responseType: 'text', headers: get_headers1} did not work
    /**** YSS GET REQUEST TEST ****/

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

  onDisplayLogin() {
    this.displayLogin = true;
  }

  closeDisplayLogin() {
    this.displayLogin = false;
  }


  typeUsername() {
    this.usernameError = null;
  }
}
