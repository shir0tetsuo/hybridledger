function getTimeleft(timeleft)
{
    var days = Math.floor(timeleft / 86400);
    var hours = Math.floor((timeleft % 86400) / 3600);
    var minutes = Math.floor((timeleft % 3600) / 60);
    var seconds = Math.floor(timeleft % 60);
    document.getElementById('minttime').innerHTML = `${days}:${hours}:${minutes}:${seconds}`
    setTimeout(() => {
        console.warn('server mint: timeleft_tick')
        getTimeleft(timeleft)
    }, 1000)
}

function getUptime()
{
    // get the innerHTML of element ID "uptime"
    var uptime = document.getElementById("serverstart").innerHTML;

    // convert the string to a number
    uptime = parseInt(uptime);
    var now = parseInt(new Date().getTime())

    var diff = parseInt((now - uptime)/1000/60)

    // convert the milliseconds to minutes
    var minutes = diff
    
    var uptime = `Up for <b>${minutes}</b> minutes.`

    setTimeout(() => {
        document.getElementById("uptime").innerHTML = uptime;
        getUptime();
    },1000);
}

function rotateTS(element, ts)
{
    //console.log(`element ${element} ts ${ts}`)
    var elementArea = document.getElementById(element)
    let stamp = new Date(parseInt(ts))

    // define diff
    var diff = new Date().getTime() - stamp.getTime()
    // convert the milliseconds to seconds
    diff = diff / 1000

    // get days, hours, minutes, seconds away from stamp
    var days = Math.floor(diff / 86400);
    var hours = Math.floor((diff % 86400) / 3600);
    var minutes = Math.floor((diff % 3600) / 60);
    var seconds = Math.floor(diff % 60);

    // set the innerHTML of element to the formatted time
    if (parseInt(ts) == 0) { elementArea.innerHTML = `--:--:--:--`; }
    else { elementArea.innerHTML = `${days}d:${hours}h:${minutes}m:${seconds}s`; }
    

    setTimeout(() => {
        rotateTS(element, ts)
    }, 1000)
    
}

function has_js()
{

    responses = [
        "You have JavaScript enabled!",
        "JavaScript was found to be working!",
        "Don't forget to keep your password a secret!",
        "Do you like clicking random things?",
        "I love bees",
        "Did you read our Terms of Service?"
    ]

    // pick a random string from responses
    var toast = responses[Math.floor(Math.random()*responses.length)]

    document.getElementById("toast").innerHTML = `<b>${toast}</b>`
    setTimeout(() => {
        document.getElementById("toast").innerHTML = '---';
    },3000);
}

function logout()
{
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "private=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setTimeout(() => {
        window.location.href = "/";
    },1000);
    document.getElementById("toast").innerHTML = "Logout Successful.";
}

//function showTosbox()
//{
//    document.getElementById("tosbox").style.display = "block";
//}

// Create a toggle function to toggle the visibility of a given element ID
function toggle(elementID) {
    var x = document.getElementById(elementID);
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}
