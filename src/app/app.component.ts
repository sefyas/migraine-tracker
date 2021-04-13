import {Component, ViewChild} from '@angular/core';
import {Events, Nav, Platform} from 'ionic-angular';
import {StatusBar} from '@ionic-native/status-bar';
// import {Keyboard} from '@ionic-native/keyboard/ngx';
import {SplashScreen} from '@ionic-native/splash-screen';
import { Push, PushObject, PushOptions} from '@ionic-native/push';

import {HomePage} from '../pages/home/home';
import {GoalModificationPage} from "../pages/goal-modification/goal-modification";
import {TrackingModificationPage} from "../pages/tracking-modification/tracking-modification";
import {NotificationModificationPage} from "../pages/notification-modification/notification-modification";
import {CouchDbServiceProvider} from "../providers/couch-db-service/couch-db-service";
import {FaqPage} from "../pages/faq/faq";
import {DataSummaryPage} from "../pages/data-summary/data-summary";
import {DataCalendarPage} from "../pages/data-calendar/data-calendar";
import {BreakFromTrackingPage} from "../pages/break-from-tracking/break-from-tracking";
import {SelectTrackingFrequencyPage} from "../pages/addGoal/select-tracking-frequency/select-tracking-frequency";
import {DataVisPage} from "../pages/data-vis/data-vis";


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;
  // make HomePage the root (or first) page, which will be the first page loaded in the nav controller
  rootPage: any = HomePage;
  pages: Array<{title: string, component: any}>;
  activePage: any;

  // constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen,
  //             private couchDBService: CouchDbServiceProvider, public keyboard: Keyboard,
  //             public events: Events) {

  constructor(public platform: Platform, 
              public statusBar: StatusBar, 
              public splashScreen: SplashScreen,
              private push: Push,
              private couchDBService: CouchDbServiceProvider, 
              public events: Events) {
    // console.log('YSS MyApp - constructor'); // YSS NOTE not fired on iOS simulation
    // YSS NOTE ngOnInit(), ionViewWillEnter(), ionViewDidEnter(), ionViewWillLeave(), 
    //          ionViewDidLeave(), or ngOnDestroy() is not fired on iOS simulation

    events.subscribe('configSeen', () => {
      this.pages = [
        { title: 'Home', component: HomePage},
        { title: 'About Migraine', component: FaqPage},
        { title: 'Data Summary', component: DataSummaryPage},
        // { title: 'Data Calendar', component: DataCalendarPage},
        // { title: 'Data Visualizations', component: DataVisPage},
        { title: 'Modify Goals', component: GoalModificationPage},
        { title: 'Modify Tracking Routines', component: TrackingModificationPage},
        { title: 'Modify Notifications', component: NotificationModificationPage},
        { title: 'Take a Break from Tracking', component: BreakFromTrackingPage},
      ];
    });

    this.initializeApp();

    // used for an example of ngFor and navigation
    if (this.couchDBService.fetchConfiguredRoutine() === null) {
      this.pages = [
        { title: 'Home', component: HomePage},
        { title: 'About Migraine', component: FaqPage}
      ];
    } else {
      this.pages = [
        { title: 'Home', component: HomePage},
        { title: 'About Migraine', component: FaqPage},
        { title: 'Data Summary', component: DataSummaryPage}, // YSS TO-DO comment
        // { title: 'Data Calendar', component: DataCalendarPage},
        // { title: 'Data Visualizations', component: DataVisPage},
        { title: 'Modify Goals', component: GoalModificationPage},
        { title: 'Modify Tracking Routines', component: TrackingModificationPage},
        { title: 'Modify Notifications', component: NotificationModificationPage},
        { title: 'Take a Break from Tracking', component: BreakFromTrackingPage},
      ];
    }
    this.activePage = this.pages[0];
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      // this.keyboard.disableScroll(true);

      this.pushSetup();

      this.logUsage('opened'); // log when the app is opened
      this.platform.pause.subscribe(() => {
        this.logUsage('background'); // log when the app goes to background
      });
      this.platform.resume.subscribe(() => {
        this.logUsage('foreground'); // log when the app comes back to foreground
      });
    });
  }

  checkActive(page) {
    return page == this.activePage;
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
    this.activePage = page;
  }

  logUsage(logtype: String) {
    console.log('YSS MyApp -', logtype);
    this.couchDBService.logUsage(logtype);//YSS TO-DO removed to see if this is the memory pressure culprit
  }

  pushSetup(){
    const options: PushOptions = {
      android: {senderID: '43998989268'}, 
      ios: {alert: 'true', badge: true, sound: 'false'}
    };
    const pushObject: PushObject = this.push.init(options);

    //console.log('YSS MyApp - pushSetup: in setup');

    pushObject.on('registration').subscribe((registration: any) => {
      console.log('YSS MyApp - pushSetup: Device registered', JSON.stringify(registration));
      this.couchDBService.storeFCMregID(registration.registrationId);
    });
    pushObject.on('error').subscribe(error => console.error('YSS MyApp - pushSetup: Error with Push plugin', error));
    pushObject.on('notification').subscribe((notification: any) => console.log('YSS MyApp - pushSetup: Received a notification', JSON.stringify(notification)));
 }
}
