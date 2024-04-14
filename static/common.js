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