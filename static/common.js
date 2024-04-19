function getTimeleft(timeleft)
{
    var days = Math.floor(timeleft / 86400);
    var hours = Math.floor((timeleft % 86400) / 3600);
    var minutes = Math.floor((timeleft % 3600) / 60);
    var seconds = Math.floor(timeleft % 60);
    document.getElementById('minttime').innerHTML = `${days}:${hours}:${minutes}:${seconds}`
    setTimeout(() => {
        console.warn('timeleft_tick')
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
