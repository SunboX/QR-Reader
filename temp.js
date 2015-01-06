

function stopStream() {
    video.mozSrcObject = null;
}

self.mozCamera.takePicture(config).then(function onSuccess(blob) {
    var image = { blob: blob };
    self.resumePreview();
    self.set('focus', 'none');
    self.emit('newimage', image);
    debug('success taking picture');
    complete();
}, function onError(error) {
    var title = navigator.mozL10n.get('error-saving-title');
    var text = navigator.mozL10n.get('error-saving-text');
    // if taking a picture fails because there's
    // already a picture being taken we ignore it.
    if (error === 'TakePictureAlreadyInProgress') {
        complete();
    } else {
        alert(title + '. ' + text);
        debug('error taking picture');
        complete();
    }
});


this.mozCamera.focusMode = 'auto';
//this.mozCamera.resumeContinuousFocus();
this.mozCamera.autoFocus().then(function onSuccess(success) {
    if (success) {
        self.focused = true;
        done('focused');
    } else {
        self.focused = false;
        done('failed');
    }
}, function onError(err) {
    self.focused = false;
    if (err.name === 'NS_ERROR_IN_PROGRESS') {
        done('interrupted');
    } else {
        done('error');
    }
});






var ctx = canvas.getContext('2d'),
    streaming = false,
    startTime = 0,
    beepSound = new Audio('beep.mp3'),
    beepSoundCanPlay = false,
    workerCount = 0,
    decodeWorker = null,
    clickEventName = document.ontouchdown ? 'touchdown' : 'mousedown';
	
beepSound.addEventListener('canplaythrough', function(){
	beepSoundCanPlay = true;
}, false);

navigator.getMedia = (
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia
);

video.addEventListener('play', function (ev) {
    if (!streaming) {

        // resizing image for slow devices
        canvas.width = 480;
        canvas.height = Math.ceil(480 / video.clientWidth * video.clientHeight);

        streaming = true;
    }
}, false);

navigator.getMedia(
    {
        video: true,
        audio: false
    },
    function(stream) {

        if (navigator.mozGetUserMedia) {

            video.mozSrcObject = stream;

        } else {

            var vendorURL = window.URL || window.webkitURL;
            video.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;

        }

        video.play();

        DecodeBar();
    },
    function(err) {
        console.log('An error occured! ' + err);
    }
);

function receiveMessage(e) {

    workerCount--;

    //var endTime = new Date().getTime();
    //var time = endTime - startTime;
    //console.info('Execution time: ' + time);

	/*
    if (e.data.success === 'log') {
        console.log(e.data.result);
        return;
    }
	*/

    if (e.data.success === true && e.data.result.length > 0) {

        StopDecoding();

        window.navigator.vibrate(200);
        if (beepSoundCanPlay) {
            beepSound.play();
        }

        var result = e.data.result[0].pop();

        // url
        if (/^(http|https|ftp):/.test(result)) {
            new MozActivity({
                name: 'view',
                data: {
                    type: 'url',
                    url: result
                }
            });
        }
        // sms
        else if (/^SMSTO:/.test(result)) {
            var data = result.split(':');
            data.shift(); // remove "SMSTO"
            new MozActivity({
                name: 'new',
                data: {
                    type: 'websms/sms',
                    number: data.shift(), // remove phone number
                    body: data.join(':') // message
                }
            });
        }
        // call
        else if (/^tel:/.test(result)) {
            var data = result.split(':');
            data.shift(); // remove "tel"
            new MozActivity({
                name: 'dial',
                data: {
                    type: 'webtelephony/number',
                    number: data.shift() // remove phone number
                }
            });
        }
        // email
        else if (/^mailto:/.test(result)) {
            new MozActivity({
                name: 'view',
                data: {
                    type: 'mail',
                    url: result
                }
            });
        }
        // email
        //"MATMSG:TO:xxx@xxx.de;SUB:xxx;BODY:xxx;;"
        else if (/^MATMSG:/.test(result)) {
            var data = /^MATMSG:TO:(.+);SUB:(.*);BODY:(.*);;/.exec(result);
            new MozActivity({
                name: 'new',
                data: {
                    type: 'mail',
                    url: 'mailto:' + data[1] + '?Subject=' + data[2] + '&Body=' + data[3]
                }
            });
        }
        // vcard
        else if (/^BEGIN:VCARD/.test(result)) {
            VCF.parse(result, function(data) {
                var contact = {};
                if (data.title && data.title[0]) {
                    contact.title = data.title[0];
                }
                if (data.n && data.n['given-name']) {
                    contact.givenName = data.n['given-name'];
                }
                if (data.n && data.n['family-name']) {
                    contact.lastName = data.n['family-name'];
                }
                if (data.tel && data.tel[0] && data.tel[0].value) {
                    contact.tel = data.tel[0].value;
                }
                if (data.email && data.email[0] && data.email[0].value) {
                    contact.email = data.email[0].value;
                }
                if (data.org && data.org[0] && data.org[0]['organization-name']) {
                    contact.company = data.org[0]['organization-name'];
                }
                // ;;Rädelstr. 7;Plauen;;08523;Germany
                if (data.adr && data.adr.value) {
                    var arr = data.adr.value.split(';');

                    /*
					if(arr[2] && arr[2] !== ''){
						contact.streetAddress = arr[2];
					}
					if(arr[5] && arr[5] !== ''){
						contact.postalCode = arr[5];
					}
					if(arr[3] && arr[3] !== ''){
						contact.locality = arr[3];
					}
					if(arr[6] && arr[6] !== ''){
						contact.countryName = arr[6];
					}
					*/

                    var address = '';
                    if (arr[2] && arr[2] !== '') {
                        address += arr[2] + ', ';
                    }
                    if (arr[5] && arr[5] !== '') {
                        address += arr[5] + ' ';
                    }
                    if (arr[3] && arr[3] !== '') {
                        address += arr[3] + ', ';
                    }
                    if (arr[6] && arr[6] !== '') {
                        address += arr[6];
                    }
                    contact.address = address;

                }
                new MozActivity({
                    name: 'new',
                    data: {
                        type: 'webcontacts/contact',
                        params: contact
                    }
                });
            });
        }
        /*
		// event
		else if(/^BEGIN:VEVENT/.test(result)){
			try {
				var data = ICAL.parse(result)
				console.log(data);
			} catch (e) {}
		}
		*/
        // text
        else {
            new MozActivity({
                name: 'view',
                data: {
                    type: 'url',
                    url: 'http://www.google.com/search?q=' + encodeURIComponent(result)
                }
            });
        }
        // wifi
        //"WIFI:T:WEP;S:Namenettz;P:gergergegeg;H:true"

        // geolocation
        //"geo:48,12,400"
    } else {

        DecodeBar();

    }
}

// Set the name of the hidden property and the change event for visibility
var hidden, visibilityChange; 
if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support 
	hidden = 'hidden';
	visibilityChange = 'visibilitychange';
} else if (typeof document.mozHidden !== 'undefined') {
	hidden = "mozHidden";
	visibilityChange = 'mozvisibilitychange';
} else if (typeof document.msHidden !== 'undefined') {
	hidden = 'msHidden';
	visibilityChange = 'msvisibilitychange';
} else if (typeof document.webkitHidden !== 'undefined') {
    hidden = 'webkitHidden';
    visibilityChange = 'webkitvisibilitychange';
}

// If the page is hidden, pause the decoder worker;
// if the page is shown, play the decoder worker
function handleVisibilityChange() {
    if (document[hidden]) {
        //console.log('hidden');
        StopDecoding();
    } else {
        //console.log('shown');
        DecodeBar();
    }
}

document.addEventListener(visibilityChange, handleVisibilityChange, false);

window.onfocus = function() {
    //console.log('focus');
    DecodeBar();
};

// Firefox Bug 879717 - drawImage on MediaStream assigned to <video> stopped working again
// See: https://bugzilla.mozilla.org/show_bug.cgi?id=879717
function drawVideo() {
    try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        decodeWorker.postMessage({
            imageData: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
            width: canvas.width,
            height: canvas.height
        });
    } catch (e) {
        if (e.name === 'NS_ERROR_NOT_AVAILABLE') {
            setTimeout(drawVideo, 0);
        } else {
            throw e;
        }
    }
}

document.getElementById('startDecoding').addEventListener(clickEventName, function () {
    DecodeBar();
}, false);

function DecodeBar() {
    if (workerCount === 0) {
        if (decodeWorker === null) {
            decodeWorker = new Worker('decoder.js');
            decodeWorker.onmessage = receiveMessage;
        }
        workerCount++;
        document.getElementById('startDecoding').hidden = true;
        //startTime = new Date().getTime();	
        drawVideo();
    }
}

function StopDecoding() {
    workerCount = 0;
    document.getElementById('startDecoding').hidden = false;
    if (decodeWorker === null) return;
    decodeWorker.terminate();
    decodeWorker = null;
}


/*
currentCamera.flashMode = (torched) ? 'torch' : 'auto';

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        trigger(false);
        if (currentCamera) {
            currentCamera.release(function() {
                console.log('Camera released');
            });
            currentCamera = null;
        }
    }
}, false);

var cameras = navigator.mozCameras.getListOfCameras();
var count = cameras.length;
console.log('cameras: ' + count);
for (var i = 0; i < cameras.length; i++) {
    navigator.mozCameras.getCamera({
        camera: cameras[i]
    }, found);
}
*/
