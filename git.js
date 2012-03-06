var fs = require("fs"),
    spawn = require("child_process").spawn;

var BUCKET = "gitrepo.node.ee";

module.exports.createRepo = createRepo;
module.exports.addRemoteRepository = addRemoteRepository;
module.exports.commitAndPush = commitAndPush;
module.exports.pull = pull;

/**
 * <p>Creates a Git repo to the selected location. If the directory does not exist,
 * it is created</p>
 * 
 * @param {String} path Location of the new Git repo
 * @param {Object} [options] Options for the repo
 * @param {String} [options.name] Repository name
 * @param {String} [options.remoteName] Remote repository name
 * @param {Function} callback Callback function to run when the function ends
 */
function createRepo(path, options, callback){
    
    if(typeof options == "function" && !callback){
        callback = options;
        options = undefined;
    }
    
    options = options || {};

    checkDir(path, function(err){
        if(err){
            return callback(err);
        }
        
        var git = spawn("git", ["init"], {cwd: path}),
            errorStr = "", error;
            
        git.stderr.on('data', function (data) {
            errorStr += data.toString("utf-8").trim();
        });
        
        git.on("exit", function(code){
            if(code){
                error = new Error(errorStr || ("Git exited with "+code));
                error.code = code;
                return callback(error);
            }
        
            if(options.remoteName && options.name){
                addRemoteRepository(path, options, callback);
            }else{
                callback(null, true);
            }
        });
        
    });
}

function commitAndPush(path, remoteName, callback){
    commit(path, function(error){
        if(error){
            return callback(error);
        }
        storeMeta(path, function(error){
            var git = spawn("jgit", ["push", remoteName, "master"], {cwd: path}),
                errorStr = "", error;
            
            git.stdout.on('data', function (data) {
                console.log(data.toString("utf-8").trim());
            });
                
            git.stderr.on('data', function (data) {
                errorStr += data.toString("utf-8");
            });
            
            git.on("exit", function(code){
                if(code){
                    error = new Error((errorStr || ("Git exited with "+code)).trim());
                    error.code = code;
                    return callback(error);
                }
            
                callback(null, true);
            });
        });
    });
}

function pull(path, remoteName, callback){
    var git = spawn("jgit", ["fetch", remoteName], {cwd: path}),
        errorStr = "", error;
    
    git.stdout.on('data', function (data) {
        console.log(data.toString("utf-8").trim());
    });
        
    git.stderr.on('data', function (data) {
        errorStr += data.toString("utf-8");
    });
    
    git.on("exit", function(code){
        if(code){
            error = new Error((errorStr || ("JGit exited with "+code)).trim());
            error.code = code;
            return callback(error);
        }
    
        var git = spawn("git", ["merge", remoteName+"/master"], {cwd: path}),
            errorStr = "", error;
        
        git.stdout.on('data', function (data) {
            console.log(data.toString("utf-8").trim());
        });
            
        git.stderr.on('data', function (data) {
            errorStr += data.toString("utf-8");
        });
        
        git.on("exit", function(code){
            if(code){
                error = new Error((errorStr || ("Git merge exited with "+code)).trim());
                error.code = code;
                return callback(error);
            }
        
            applyMeta(path, function(error){
                if(error){
                    console.log(error);
                }
                callback(null, true);
            });
        });
    });
}

function commit(path, callback){
    var git = spawn("git", ["add", "-A"], {cwd: path}),
        errorStr = "", error;
    
    git.stdout.on('data', function (data) {
        console.log(data.toString("utf-8").trim());
    });
        
    git.stderr.on('data', function (data) {
        errorStr += data.toString("utf-8").trim();
    });
    
    git.on("exit", function(code){
        if(code){
            error = new Error(errorStr || ("git add exited with "+code));
            error.code = code;
            return callback(error);
        }
    
        var git = spawn("git", ["commit", "-m", "update"], {cwd: path}),
            errorStr = "", error;

        git.stdout.on('data', function (data) {
            console.log(data.toString("utf-8").trim());
        });

        git.stderr.on('data', function (data) {
            errorStr += data.toString("utf-8").trim();
        });
        
        git.on("exit", function(code){
            if(code){
                error = new Error(errorStr || ("git commit exited with "+code));
                error.code = code;
                return callback(error);
            }
        
            callback(null, true);
        });
    });
}

function storeMeta(path, callback){
    var git = spawn("git-cache-meta", ["--store"], {cwd: path}),
        errorStr = "", error;
        
    git.stderr.on('data', function (data) {
        errorStr += data.toString("utf-8").trim();
    });
    
    git.on("exit", function(code){
        if(code){
            error = new Error(errorStr || ("git-cache-meta exited with "+code));
            error.code = code;
            return callback(error);
        }
    
        callback(null, true);
    });
}

function applyMeta(path, callback){
    var git = spawn("git-cache-meta", ["--apply"], {cwd: path}),
        errorStr = "", error;
        
    git.stderr.on('data', function (data) {
        errorStr += data.toString("utf-8").trim();
    });
    
    git.on("exit", function(code){
        if(code){
            error = new Error(errorStr || ("git-cache-meta exited with "+code));
            error.code = code;
            return callback(error);
        }
    
        callback(null, true);
    });
}

/**
 * <p>Adds a S3 remote repository to a repo</p>
 * 
 * @param {String} path Path to the repository
 * @param {Object} options Options object
 * @param {String} options.name Repository name
 * @param {String} options.remoteName Remote repository name
 * @param {Function} callback Callback function to run on completion
 */
function addRemoteRepository(path, options, callback){
    var git = spawn("git", ["remote", "add", options.remoteName, "amazon-s3://.jgit@"+BUCKET+"/"+options.name+".git"], {cwd: path}),
        errorStr = "", error;
        
    git.stderr.on('data', function (data) {
        errorStr += data.toString("utf-8").trim();
    });
    
    git.on("exit", function(code){
        if(code){
            error = new Error(errorStr || ("Git exited with "+code));
            error.code = code;
            return callback(error);
        }
    
        callback(null, true);
    });
}

/**
 * <p>Ensures that a directory exists on selected location, or creates one if needed</p>
 * 
 * @param {String} dir Directory path
 * @param {Number} [mode=0666] Directory flags
 * @param {Function} callback Callback function to run when the operation succeedes or fails 
 */
function checkDir(dir, mode, callback){
    dir = parseDir(dir || "");
    
    if(!callback && typeof mode=="function"){
        callback = mode;
        mode = undefined;
    }
    
    var created = [],
        dirs = dir.split("/"),
        fulldir = [];
    
    if(!dir){
        callback(null, false);
    }
    
    walkDirs();
    
    function walkDirs(){
        var curdir;
        
        if(!dirs.length){
            return callback(null, true);
        }
        
        fulldir.push(dirs.shift());
        curdir = fulldir.join("/");
        
        if(!curdir){
            return process.nextTick(walkDirs);
        }
        
        fs.stat(curdir, function(err, stats){
            if(err){
                return createDir(curdir);
            }
            if(stats.isFile()){
                return cleanOut(new Error(curdir +" is an existing file"))
            }
            if(stats.isDirectory()){
                return process.nextTick(walkDirs);
            }
            return cleanOut(new Error(curdir +" status unknown"));
        });
        
    }
    
    function createDir(dir){
        fs.mkdir(dir, mode, function(err){
            if(err){
                return cleanOut(err);
            }else{
                created.push(dir);
                walkDirs();
            }
        });
    }
    
    function cleanOut(err){
        
        removeDirs();
        
        function removeDirs(){
            var curdir = created.pop();
            if(!curdir){
                return callback(err);
            }else{
                fs.rmdir(curdir, removeDirs);
            }
        }
        
    }
       
}

/**
 * <p>Resolves any . or .. names from the path</p>
 * 
 * @param {String} dir Directory path
 * @return {String} resolved directory path
 */
function parseDir(dir){
    var dirpath = dir.trim().split("/");
    for(var i=0, len = dirpath.length; i<len; i++){
        switch(dirpath[i].trim()){
            case "..":
                if(i>0 && dirpath[i-1]){
                    dirpath.splice(i-1,2);
                    len -= 2;
                    i -= 2;
                    break;
                }
            case ".":
                dirpath.splice(i,1);
                len--;
                i--;
                break;
        }
    }
    return dirpath.join("/");
}