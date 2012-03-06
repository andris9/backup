var git = require("./git");

//git.createRepo("/tmp/repos/andris/test", {name: "my-repo", remoteName:"s3"}, function(error){
//    console.log(error || "Success!");
//});

git.createRepo("/tmp/repos/andris/test2", {name: "my-repo", remoteName:"s3"}, function(error){
    console.log(error || "Success!");
    git.pull("/tmp/repos/andris/test2", "s3", function(error){
        console.log(error || "Success!");
    });
});

