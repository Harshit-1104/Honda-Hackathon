
const Alexa = require('ask-sdk-core');
const firebase = require('firebase');
const moment = require('moment-timezone');
const util = require('./util');
const storage = require('./storage')
let mainid;

var firebaseConfig = {
    apiKey: "AIzaSyDWhoU2xu_P37aq_TPp_bI1NpsSW3XvT00",
    authDomain: "honda-840f2.firebaseapp.com",
    databaseURL: "https://honda-840f2-default-rtdb.firebaseio.com",
    projectId: "honda-840f2",
    storageBucket: "honda-840f2.appspot.com",
    messagingSenderId: "624369649172",
    appId: "1:624369649172:web:d41d540620e52787fb4901",
    measurementId: "G-79KEV18HZY"
  };
firebase.initializeApp(firebaseConfig);
const db=firebase.database();

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        db.goOnline();
        const speakOutput = `Are you awake?`
        const reprompt = 'Are you awake? Please respond or i\'ll have to take safety measures...<audio src="soundbank://soundlibrary/alarms/air_horns/air_horns_04"/><audio src="soundbank://soundlibrary/alarms/buzzers/buzzers_08"/><audio src="soundbank://soundlibrary/alarms/car_alarms/car_alarms_05"/>'
        const id = handlerInput.requestEnvelope.session.user.userId;
        var today = new Date();
        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        const triggertime = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        const foo =  await db.ref("Rash Drivers").push({
                    ID_:id,
                    Today_Date : date,
                    Incident_Time : triggertime
             });
        mainid = await db.ref("Drunk Drivers").push({
                    ID_:id,
                    Today_Date : date,
                    Incident_Time :triggertime
             }).getKey();
        db.goOffline();
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(reprompt)
            .getResponse()
    }
};


const FinisherIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getIntentName(handlerInput.requestEnvelope) === 'Finisher';
    },
    async handle(handlerInput) {
        db.goOnline()
        const res = await db.ref('Drunk Drivers').child(mainid).remove();
        db.goOffline();
        
        let speechText = 'That\'s great!... I have stored your details for security purposes.'
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        var timezone = 'Asia/Kolkata'
        const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId
        
        const upsServiceClient = serviceClientFactory.getUpsServiceClient();
        timezone = await upsServiceClient.getSystemTimeZone(deviceId);
        console.log(timezone)
        
        try {
            const {permissions} = requestEnvelope.context.System.user;
            if (!(permissions && permissions.consentToken))
                throw { statusCode: 401, message: 'No permissions available'};
            
            const reminderServiceClient = serviceClientFactory.getReminderManagementServiceClient();
            const remindersList = await reminderServiceClient.getReminders();
            console.log('Current reminders: ' + JSON.stringify(remindersList));
            
            //console.log(sessionAttributes);
            
            for (var i = 0; i < remindersList.alerts.length; i++) {
                if (remindersList.alerts[i].status !== "COMPLETED") {
                    var token = remindersList.alerts[i].alertToken;
                    await reminderServiceClient.deleteReminder(token);
                    console.log('Deleted previous reminder token: ' + token);
                }
            }
            
            
            /*
            if (previousReminder) {
                try {
                    if (remindersList.totalCount !== "0") {
                        await reminderServiceClient.deleteReminder(previousReminder);
                        console.log('Deleted previous reminder token: ' + previousReminder);
                    }
                } catch (error) {
                    console.log('Failed to delete reminder: ' + previousReminder + 'via ' + JSON.stringify(error));    
                }
            }*/
            
            moment.locale(Alexa.getLocale(requestEnvelope));
            const createdMoment = moment().tz(timezone);
            let triggerMoment = createdMoment.add(1, 'minutes');
            
            console.log('Reminder schedule: ' + triggerMoment.format('YYYY-MM-DDTHH:mm:ss.000'));    // YYYY-MM-DDTHH:mm:00.000
            const message = 'I hope you are awake!... stay safe'
            const reminder = util.createReminder(createdMoment, triggerMoment, timezone, Alexa.getLocale(requestEnvelope), message)
            const reminderResponse = await reminderServiceClient.createReminder(reminder);
            
            console.log('Reminder created with token: ' + reminderResponse.alertToken);
        } catch (error) {
            console.log(JSON.stringify(error));
            
            switch (error.statusCode) {
                case 401:
                    speechText = '401'
                    break;
                case 403:
                    speechText = '403'
                    break;
                default:
                    speechText = 'Expect the unexpected!'
            }
        }
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .withShouldEndSession(true)
            .getResponse()
    }
}
/*
const ResponseInterceptor = {
    async process(handlerInput) {
        db.goOnline()
        await db.ref("Honda").push({
            drunk:"From interceptor"
        })
        db.goOffline()
        return handlerInput.responseBuilder.getResponse();
    }
};
*/

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */

 
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        FinisherIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();