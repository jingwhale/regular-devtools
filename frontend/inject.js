// this is injected to the app page when the panel is activated.
// this script serves as the model layer of the devtools
var devtoolsModel = (function() {
    var hook = window.__REGULAR_DEVTOOLS_GLOBAL_HOOK__;
    var ins = window.__REGULAR_DEVTOOLS_GLOBAL_HOOK__.ins || [];
    var store = [];
    var length = ins.length;

    var findElementByUuid = function(nodes, uuid) {
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].uuid === uuid) {
                return nodes[i]
            } else {
                if (nodes[i].childNodes.length) {
                    var result = findElementByUuid(nodes[i].childNodes, uuid);
                    if (result) {
                        return result;
                    }
                }
            }
        }
    }

    var treeGen = function(root, container) {
        var tree = container || [];
        if (root.group) {
            for (var i = 0; i < root.group.children.length; i++) {
                walker(root.group.children[i], tree)
            }
        }
        return tree;
    }

    var walker = function(node, container) {
        // node is a element
        if (node.type && node.group) {
            for (var i = 0; i < node.group.children.length; i++) {
                walker(node.group.children[i], container)
            }
            // node is a Group
        } else if (node.children) {
            for (var j = 0; j < node.children.length; j++) {
                walker(node.children[j], container)
            }
            // node is a regular instance
        } else if (node.uuid) {
            var n = {
                uuid: node.uuid,
                name: node.name || "node",
                data: node.data,
                childNodes: []
            }
            container.push(n);
            if (node.group) {
                treeGen(node, n.childNodes)
            }
        }
    }

    var treeWalker = function(parentNode, children) {
        for (var i = 0; i < children.length; i++) {
            var currNode = children[i];
            var node = {
                uuid: currNode.uuid,
                name: currNode.name || "node",
                data: currNode.data,
                childNodes: [],
                inspectable: !!currNode.node,
                shadowFlag: false
            }
            if (!currNode.node && currNode.$outer) {
                node.shadowFlag = true;
                var outerNode;
                for (var j = 0; j < children.length; j++) {
                    if (currNode.$outer === children[j]) {
                        outerNode = findElementByUuid(parentNode.childNodes, children[j].uuid);
                        continue;
                    }
                }
                if (outerNode) {
                    outerNode.childNodes.push(node);
                } else {
                    parentNode.childNodes.push(node);
                }
            } else {
                parentNode.childNodes.push(node);
            }

            if (children[i]._children) {
                treeWalker(node, currNode._children);
            }
        }
    }

    var guid = function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    var uuidGen = function(obj) {
        if (!obj.uuid) {
            obj.uuid = guid();
        }
    }

    var uuidGenArr = function(arr) {
        for (var i = 0; i < arr.length; i++) {
            if (!arr[i].uuid) {
                uuidGen(arr[i]);
            }
        }
    }

    // eliminate circular reference
    var sanitize = function(store) {
        var str = JSON.stringify(store, function(key, value) {
            if (value instanceof Regular) {
                return;
            }
            return value;
        });
        return JSON.parse(str);
    }

    var storeGen = function() {
        var start = new Date();
        store = [];
        for (var i = 0; i < ins.length; i++) {
            if (ins[i].$root === ins[i]) {
                var node = {
                    uuid: ins[i].uuid,
                    name: name || "root",
                    data: ins[i].data,
                    childNodes: []
                }
                treeGen(ins[i], node.childNodes);
                store.push(node);
            }
            /**
           
                if (ins[i].parentNode) {
                    var id = ins[i].parentNode.id;
                    var classNames = ins[i].parentNode.className.replace(/\s+/g, ' ').split(" ").join(".");
                    var name = ins[i].name || "root#" + id + ( classNames ? '.' + classNames : '' );
                }
                var node = {
                    uuid: ins[i].uuid,
                    name: name || "root",
                    data: ins[i].data,
                    childNodes: [],
                    inspectable: !!ins[i].parentNode
                }
                store.push(node);
                if (ins[i]._children.length) {
                    treeWalker(node, ins[i]._children)
                }
            }
            **/
        }
        store = sanitize(store)
        var end = new Date();
        console.log(store, end - start);
        return store;
    }

    // generate uuid for the first time
    uuidGenArr(ins);
    return {
        init: function() {
            if (ins.length === 0) {
                return;
            }
            hook.on("flushMessage", function() {
                window.postMessage({
                    type: "FROM_PAGE",
                    data: {
                        type: "dataUpdate",
                        nodes: storeGen()
                    }
                }, "*");
            })

            hook.on("addNodeMessage", function(obj) {
                uuidGen(obj);
            })

            hook.on("reRender", function(obj) {
                window.postMessage({
                    type: "FROM_PAGE",
                    data: {
                        type: "reRender",
                        nodes: storeGen()
                    }
                }, "*");
            })

            window.postMessage({
                type: "FROM_PAGE",
                data: {
                    type: "initNodes",
                    nodes: storeGen()
                }
            }, "*");
        }
    }
})();

devtoolsModel.init();
