//Virtual Tours
//Featuring top attractions in cities where G. has offices
//By @lizmyers, @lguinn 
//Advisors: @pvergadia
//Content: [ea. city "owner" will be listed here]
//March 28, 2020
//Version 1.0
//License: MIT? - open source. learning project

'use strict';
 
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card} = require('dialogflow-fulfillment');
 
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'ws://virtual-tours-usycht.firebaseio.com/'
});

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcomeHandler(agent) {
    var today = new Date();
    var curHr = today.getHours();
    var greet = "";
    var welcome = `Let's see the top sights in London. What strikes your fancy? Landmarks, museums, or cultural icons?`;
     
      if (curHr < 12) {
        greet = "Good morning! " + welcome;
      } else if (curHr < 18) {
        greet = "Good afternoon! " + welcome;
      } else {
        greet = "Good evening! " + welcome;
      }

    agent.add(greet);
  }
 
  function fallbackHandler(agent) {
    agent.add(`Sorry, I didn't get that`);
    agent.add(`Please try again?`);
  }
  
  function getcategoryHandler(agent) {
    const userCat = (agent.parameters.category).toLowerCase();
    const iconsArr = [];
    const landmarksArr = [];
    const museumsArr = [];

    return admin.database().ref('LonSites/').once('value').then((snapshot) => {
        var data = snapshot.val();
        for(i = 0; i<= data.length; i++){
          if(data.category == 'landmark'){
            landmarksArr.push(data.item);
          }
        }
   
      
      for(var i = 0; i <= LonSitesArr.length; i++){
          if(userCat == 'landmarks' && LonSitesArr.item[i].category == userCat){
            landmarksArr.push(LonSitesArr.item[i]);
          }else if(userCat == 'museums' && LonSitesArr.item[i].category == userCat){
            museumsArr.push(LonSitesArr.item[i]);
          }else{
            iconsArr.push(LonSitesArr.item[i]);
          }
      };
     
       switch(userCat){
            case 'cultural icons':
            case 'icons':
              agent.add('Sure. The cultural icons I have are: ' + iconsArr);
            break;
            case 'landmarks':
              agent.add('The landmarks I have are: ' + landmarksArr);
            break;
            case 'museums':
              agent.add('Alright. For museums we have ' + museumsArr);
            break;
          }
          agent.add(`Which would you like?`);
        }//end switch
     );//end snapshot
 }//end getcategoryHandler

  function getSiteHandler(agent) {

    let userSiteName = (agent.parameters.site).toLowerCase();
    const userSite = userSiteName.capitalize();

    return admin.database().ref('LonSites/').once('value').then((snapshot) => {

      //setup vars to build a display card
      const minTime = snapshot.child(userSite + '/min_time').val();
      const maxTime = snapshot.child(userSite + '/max_time').val();
      const duration = `TIME: `+ minTime + ` - ` + maxTime + ' hours';
      const category = snapshot.child(userSite + '/category').val(); 
      const what = snapshot.child(userSite + '/what').val();
      const why = snapshot.child(userSite + '/why').val();
      const image = snapshot.child(userSite + '/image').val();
      const link = snapshot.child(userSite + '/more').val();

       if(what !== null){
         
            agent.add(`Here's what I have for ${userSite} .`);

            //display a card w/image from Firebase Storage
            
            agent.add(new Card({
                title: userSite,
                subtitle: category,
                text: duration + '  \n  \n WHAT: ' + what + '  \n  \n WHY: ' + why,
                imageUrl: image,
                buttonText: 'more',
                buttonUrl: link,
            }),
          );

       } else { //couldn't access data

            agent.add(`Sorry, I couldn't find the data.`);

       } //end if/else
    }); // end snapshot
  }//end getSiteHandler

  let intentMap = new Map();
  intentMap.set('Welcome_Intent', welcomeHandler);
  intentMap.set('Fallback_Intent', fallbackHandler);
  intentMap.set('Get_category_Intent', getcategoryHandler);
  intentMap.set('Get_Site_Intent', getSiteHandler);
  agent.handleRequest(intentMap);
});

// Helper Functions ------------------------------------------------------------------------------
String.prototype.capitalize = function() {
  return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};