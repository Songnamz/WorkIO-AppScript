function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Media v 1.5')
    .addMetaTag('viewport', 'width=device-width , initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getData() { 
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Members"); 
  var getLastRow = sheet.getLastRow();  
  return sheet.getRange(2, 1, getLastRow - 1, 1).getValues();  
}

function getWork() { 
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Work"); 
  var getLastRow = sheet.getLastRow();  
  return sheet.getRange(2, 1, getLastRow - 1, 1).getValues();  
}

function userClick(data) {
    let response = Maps.newGeocoder().reverseGeocode(data.lat, data.lon);
    let geoAddress = response.results[0].formatted_address;
    
    var strYear543 = parseInt(Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy")) + 543;  
    var strhour=Utilities.formatDate(new Date(), "Asia/Bangkok", "HH");
    var strMinute=Utilities.formatDate(new Date(), "Asia/Bangkok", "mm");
    var strMonth1 = Utilities.formatDate(new Date(), "Asia/Bangkok", "M");
    var strMonthCut1 = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]  
    var strMonthThai = strMonthCut1[strMonth1];
    var strDay = Utilities.formatDate(new Date(), "Asia/Bangkok", "d"); // d ไม่มี 0 นำ dd มี 0 นำ
    var daytime=strDay+' '+strMonthThai+' '+strYear543+ ' Time '+strhour+':'+strMinute+' ⏰';
    
    var text_data1 = '📣 Alert Location\n';
    text_data1 += '⏰Date&Time\n'+daytime+'\n👨‍💼Name\n'+data.username+'\n📃Work\n'+data.work+'\n📌Coordinate\n'+data.lat+","+data.lon + '\n🏡Address\n'+geoAddress;
    
    // Write data to Google Sheets
    clockIn(data.username, data.work);

    var latitude = data.lat
    var longitude = data.lon
    var map = Maps.newStaticMap()
        .setSize(600,600)  //(Max:1300 X 1300
        .setLanguage('TH')
        .setMobile(true)
        .setMapType(Maps.StaticMap.Type.HYBRID)

    map.addMarker(latitude, longitude)
    var mapBlob = map.getBlob()
    var mapUrl = map.getMapUrl()
    
    sendHttpPostImage(text_data1, mapBlob);
}


function sendHttpPostImage(mapUrl, mapBlob){
    var token = "Line Token Here";
    var formData = {
        'message' : '\n'+mapUrl,
        'imageFile': mapBlob
    }
    var options =
    {
        "method"  : "post",
        "payload" : formData,  // message, imageFile, formData, Post
        "headers" : {"Authorization" : "Bearer "+ token}
    };

    UrlFetchApp.fetch("https://notify-api.line.me/api/notify",options);
}

function clockIn(user, work) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheetByName("Data");

  // Check if the user is already clocked in
  var dataRange = mainSheet.getDataRange();
  var values = dataRange.getValues();
  for (var i = 1; i < values.length; i++) { // Start from row 2 (skipping header)
    if (values[i][0] === user && values[i][2] === "") {
      // If user is already clocked in, return an error message
      return [['You haven\'t clocked out yet!', '', user]];
    }
  }

  // Find the next empty row
  var lastRow = mainSheet.getLastRow();
  var emptyRowIndex = lastRow + 1;

  // Set the values in the next empty row
  mainSheet.getRange(emptyRowIndex, 1).setValue(user).setFontSize(12);
  mainSheet.getRange(emptyRowIndex, 2).setValue(new Date())
    .setNumberFormat("dd/MM/yyyy - HH:mm:ss")
    .setHorizontalAlignment("left")
    .setFontSize(12);
  mainSheet.getRange(emptyRowIndex, 5).setValue(work).setFontSize(12); // Added work

  // Return success message
  return [['SUCCESS', getDate(new Date()), user]];
}




function clockOut(user) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheetByName("Data");
  var lastRow = mainSheet.getLastRow();
  var foundRecord = false;
  var new_date = new Date();
  var return_date = getDate(new_date);
  var error = 'SUCCESS';
  var return_array = [];

  for (var j = 2; j <= lastRow; j++) {
    if (user ==  mainSheet.getRange(j, 1).getValue() && mainSheet.getRange(j,3).getValue() == '') {
      var clockInTime = mainSheet.getRange(j, 2).getValue();
      var clockOutTime = new_date;
      var millisecondsDifference = clockOutTime - clockInTime;
      var seconds = Math.floor((millisecondsDifference / 1000) % 60);
      var minutes = Math.floor((millisecondsDifference / (1000 * 60)) % 60);
      var hours = Math.floor((millisecondsDifference / (1000 * 60 * 60)) % 24);
      var timeDifferenceString = '';

      if (hours > 0) {
        timeDifferenceString += hours + ' hour ';
      }
      if (minutes > 0) {
        timeDifferenceString += minutes + ' minute ';
      }
      if (seconds > 0) {
        timeDifferenceString += seconds + ' second ';
      }

      mainSheet.getRange(j,3)
        .setValue(new_date)
        .setNumberFormat("dd/MM/yyyy - HH:mm:ss")
        .setHorizontalAlignment("left")
        .setFontSize(12);
      mainSheet.getRange(j,4).setValue(timeDifferenceString.trim())
        .setHorizontalAlignment("left")
        .setFontSize(12);  
      foundRecord = true;     
    }
  }
  
  if (foundRecord == false) {
    return_array.push(['<br> You haven/t clocked in yet! ', '', user]);
    return return_array; 
  }
  
  TotalHours();
  
  return_array.push([error, return_date, user]);
  return return_array;
}

function TotalHours() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheetByName("Data");
  var lastRow = mainSheet.getLastRow();
  var totals = [];

  for (var j = 2; j <= lastRow; j++) {
    var name = mainSheet.getRange(j, 1).getValue();
    var clockOutTime = mainSheet.getRange(j, 3).getValue();
    var clockInTime = mainSheet.getRange(j, 2).getValue();

    if (clockOutTime !== "" && clockInTime !== "") {
      var millisecondsDifference = clockOutTime - clockInTime;
      var totalSeconds = millisecondsDifference / 1000;
      var totalHours = totalSeconds / 3600;

      var foundRecord = false;
      for (var i = 0; i < totals.length; i++) {
        if (totals[i][0] === name) {
          totals[i][1] += totalHours;
          foundRecord = true;
          break;
        }
      }

      if (!foundRecord) {
        totals.push([name, totalHours]);
      }
    }
  }

  mainSheet.getRange("F2:G").clear();

  for (var i = 0; i < totals.length; i++) {
    mainSheet.getRange(2 + i, 6).setValue(totals[i][0]).setFontSize(12);
    mainSheet.getRange(2 + i, 7).setValue(convertHoursToTime(totals[i][1])).setFontSize(12);
  }
}

function convertHoursToTime(hours) {
  var totalSeconds = hours * 3600;
  var hoursPart = Math.floor(totalSeconds / 3600);
  var minutesPart = Math.floor((totalSeconds % 3600) / 60);
  var secondsPart = Math.floor(totalSeconds % 60);
  
  return hoursPart + ' hour ' + minutesPart + ' minute ' + secondsPart + ' second';
}

function addZero(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}

function getDate(return_array) {
  var currentDate = return_array;
  var date = currentDate;
  var currentMonth = currentDate.getMonth()+1;
  var currentYear = currentDate.getFullYear()+0;
  var currentHours = currentDate.getHours();
  var currentMinutes = addZero(currentDate.getMinutes());
  var currentSeconds = addZero(currentDate.getSeconds());
  var suffix = '';

  var date = currentDate.getDate()+ '/' + currentMonth.toString().toString() + '/' + 
             currentYear.toString() + '<br> Time '  + currentHours.toString() + ':' +
             currentMinutes.toString() + ':' + currentSeconds.toString() + ' ' + suffix;
  
  return date;
}
