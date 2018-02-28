(function () {
    var Ext = window.Ext4 || window.Ext;
    var gApp;

Ext.define('Niks.Apps.TeamLoading2', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    itemId: 'rallyApp',

    config: {
        defaultSettings: {
            maxIterations: 6,    //Allow user to override
            filterCapacities: false
        }
    },

    items: [
        {  
            xtype: 'container',
            itemId: 'filterBox'
        },{
            xtype: 'container',
            itemId: 'rootSurface',
            margin: '5 5 5 5',
            width: window.innerWidth,
            height: window.innerHeight,
            layout: 'auto',
            autoEl: {
                tag: 'svg'
            },
            listeners: {
                afterrender:  function() {  gApp = this.up('#rallyApp'); gApp._onElementValid(this);},
            },
            visible: false
        }
    ],

    columnConfig: [],
    allUsers: [],

    margin: {top: 30, right: 20, bottom: 30, left: 20},
    treewidth: 300,
    barHeight: 20,
    duration: 400,
    barIndent: 20,
    iterationColoumnWidth: 150,

    getSettingsFields: function() {
        var returned = [
            {
                name: 'maxIterations',
                xtype: 'numberfield',
                fieldLabel: 'Number of Iterations to Show',
                minValue: 1
            },
            {
                name: 'filterCapacities',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Filter Capacities',
                labelAlign: 'top'
            }
        ];
        return returned;
    },

    _onElementValid: function(rootSurface) {
        this._setSVGSize(rootSurface);

        gApp.svg = d3.select('svg')
            .append("g")
                .attr("transform", "translate(" + gApp.margin.left + "," + gApp.margin.top + ")");

        //Add the sprint filters to the top box:
        var me = this;
        this.down('#filterBox').add({
            xtype: 'rallyiterationcombobox',
            fieldLabel: 'Choose Start Iteration:',
            labelWidth: 120,
            margin: '5 5 5 5',
            stateId: Ext.id() + 'iterBox',
            stateful: true,
            maxWidth: 600,
            width: 600,
            itemId: 'iterCbx',

            listeners: {
                select: me._iterationSelect,
                ready: me._iterationLoad,
                scope: me
            }
        });

        
    },

    _setSVGSize: function(surface) {
        var svg = d3.select('svg');
        svg.attr('width', surface.getEl().dom.clientWidth);
        svg.attr('height',surface.getEl().dom.clientHeight);
    },

    _iterationSelect: function(){
        debugger;
    },

    _iterationLoad: function(){
        this.fireEvent('iterationsReady');
    },

    _defineDefaultColumnConfig: function() {
        var me = this;
        /* We need to get the SVG pane, split it into columns: 
            1: Persons name
            2: Project in Question
            3-n: Iterations
        */
       me.columnConfig = [];

        //Find the iterations we need
        var store = gApp.down('#iterCbx').getStore();
        var startRecord = gApp.down('#iterCbx').getRecord().index;
        //Sort order is backwards for iterations
        for ( var j = 0, i = startRecord; (i >= 0) && ( j < gApp.getSetting('maxIterations')) ; --i, j++) {    
            me.columnConfig.push({
                name: store.getRecords()[i].get('Name'),
                recordType: 'Iteration',
                fieldName: 'Name',
                actuals: 0,        //Use this record later per user
                taskEstimate: 0,
                capacity: 0
            });
        }
        me.fireEvent('columnsReady');
    },

    _drawTree: function(tree) {
        gApp.root = d3.hierarchy(tree);
        gApp.root.eachAfter( function(n) {
            //Sum up the  numbers for colour choices
            n.capacity = 0;
            n.taskEstimate = 0;
            n.actuals = 0;
            if ( n.children) {
                //This is a parent node, so sum the sums
                _.each(n.children, function(child){
                    n.capacity += child.capacity;
                    n.taskEstimate += child.taskEstimate;
                    n.actuals += child.actuals;
                });
            } else {
                //Leaf node, so sum the iterations
                _.each(n.data.iterations, function(child){
                    n.capacity += child.capacity;
                    n.taskEstimate += child.taskEstimate;
                    n.actuals += child.actuals;
                });
            }
        });
        gApp.root.x0 = 0;
        gApp.root.y0 = 0;
        gApp._update(gApp.root);
    },
    
    colour: function (d) {
        if (!d.capacity) return '#ffffff'

        var load = d.taskEstimate / d.capacity;
        if (load < 0.8) {
            return "#B2E3B6"; // Green
        } else if (load < 1.0) {
            return "#FBDE98"; // Orange
        }
        return    "#FCB5B1"; // Red
    },

    barWidth: function(d) {
        return gApp.treewidth - (d.depth * gApp.barIndent);
    },

    nodeId: 0,
    
    _update: function(source) {
        var nodes = gApp.root.descendants();
        var height = Math.max(800, nodes.length * gApp.barHeight + gApp.margin.top + gApp.margin.bottom);

        var diagonal = d3.linkHorizontal()
            .x(function(d) { return d.y; })
            .y(function(d) { return d.x; });

        gApp.svg.transition()
            .duration(gApp.duration)
            .attr("height", height)
            .attr("width", (gApp.iterationColoumnWidth * gApp.columnConfig.length) +
                gApp.treewidth + gApp.margin.left + gApp.margin.right);

        var index = -1;
        gApp.root.eachBefore( function(n) {
            n.x = ++index * gApp.barHeight;
            n.y = n.depth * 20;
        });

        var node = gApp.svg.selectAll(".node")
            .data(nodes, function(d) { 
                return d.id || (d.id = ++gApp.nodeId); 
            });
        var nodeEnter = node.enter().append('g')
            .attr("class", "node")
            .attr("transform", function() { return "translate(" + source.y0 + "," + source.x0 + ")"; })
            .style("opacity", 0);
      
        // Enter any new nodes at the parent's previous position.
        nodeEnter.append("rect")
            .attr("y", -gApp.barHeight / 2)
            .attr("height", gApp.barHeight)
            .attr("width", gApp.barWidth)
            .style("fill", gApp.colour)
            .on("click", gApp._click);
      
        nodeEnter.append("text")
            .attr("dy", 3.5)
            .attr("dx", 5.5)
            .text(function(d) { return d.data.name; });
      
        //Now add all the iteration information on the end of the record
        nodeEnter.call( function(n) {
            var iterationGroup = nodeEnter.append('g')            
            .attr("transform", function(d) { 
                return "translate(" + (gApp.treewidth - (d.depth * gApp.barIndent)) + "," + (-gApp.barHeight / 2) + ")"; 
            });

            _.each( gApp.columnConfig, function(column, index) {

                iterationGroup.append('text')
//                    .attr('dy', -gApp.margin.top)
                    .attr('dy', gApp.barHeight/2)
                    .attr('dx', gApp.iterationColoumnWidth * (index + 0.5))
                    .style("text-anchor",  'middle')
                    .text( function(d) { 
                        var iteration = d.data.iterations ? d.data.iterations[index] : 0;
                        if ( iteration) {
                            return iteration.capacity ? 
                                Math.trunc((iteration.taskEstimate/iteration.capacity) * 10000)/100:
                                0;
                        }
                        else {
                            if (d.parent === null ) {
                                return gApp.columnConfig[index].name;
                            }
                        }
                        return '';
                    });

                iterationGroup.append("rect")
                    .style("fill", function(d) {
                            var iteration = d.data.iterations ? d.data.iterations[index] : 0;
                            if ( iteration) return gApp.colour(iteration);
                            return '#ffffff';
                        })
                    .attr("height", gApp.barHeight)
                    .attr('x', index * gApp.iterationColoumnWidth)
                    .attr("width", gApp.iterationColoumnWidth);
                });
            });

        // Transition nodes to their new position.
        nodeEnter.transition()
            .duration(gApp.duration)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
            .style("opacity", 1);
      
        node.transition()
            .duration(gApp.duration)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
            .style("opacity", 1)
            .select("rect")
            .style("fill", gApp.colour);
      
        // Transition exiting nodes to the parent's new position.
        node.exit()
            .transition()
            .duration(gApp.duration)
            .attr("transform", function() { return "translate(" + source.y + "," + source.x + ")"; })
            .style("opacity", 0)
            .remove();
      
        // Update the links…
        var link = gApp.svg.selectAll(".link")
          .data(gApp.root.links(), function(d) { return d.target.id; });
      
        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function() {
              var o = {x: source.x0, y: source.y0};
              return diagonal({source: o, target: o});
            })
          .transition()
            .duration(gApp.duration)
            .attr("d", diagonal);
      
        // Transition links to their new position.
        link.transition()
            .duration(gApp.duration)
            .attr("d", diagonal);
      
        // Transition exiting nodes to the parent's new position.
        link.exit()
            .transition()
            .duration(gApp.duration)
            .attr("d", function() {
              var o = {x: source.x, y: source.y};
              return diagonal({source: o, target: o});
            })
            .remove();
      
        // Stash the old positions for transition.
        gApp.root.each(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });
    },

    _click: function(d) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        gApp._update(d);
    },

    _getProjectsList: function() {
        var currentContext = Rally.environment.getContext();
        var project = currentContext.getProject();

        //Get all the projects into a store and then apply some filters
        //Because the wsapi endpoint for projects does not respect context,we have to do something like 
        //this.....
        var projFilters = [
            {
                value: project.Name,
                property: 'Name'
            },
            {
                value: project.Name,
                property: 'Parent.Name'
            },
            {
                value: project.Name,
                property: 'Parent.Parent.Name'
            },
            {
                value: project.Name,
                property: 'Parent.Parent.Parent.Name'
            },
            {
                value: project.Name,
                property: 'Parent.Parent.Parent.Parent.Name'
            },
            {
                value: project.Name,
                property: 'Parent.Parent.Parent.Parent.Parent.Name'
            },
            {
                value: project.Name,
                property: 'Parent.Parent.Parent.Parent.Parent.Parent.Name'
            },
            {
                value: project.Name,
                property: 'Parent.Parent.Parent.Parent.Parent.Parent.Parent.Name'
            }
        ];
        gApp.projectStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'Project',
            autoLoad: true,
            fetch: true,
            filters: Rally.data.wsapi.Filter.or(projFilters),

            pageSize: 1,        //Get just the one for now to see how many there are
            listeners: {
                load: function(store, data, success) {
                    if ( success) {
                        if (store.totalCount > 200){
                            Rally.ui.notify.notifier.showError({
                                message: 'This app cannot fetch more than 200 projects. Move to a lower node'
                            });
                        }
                        else {
                            //Refetch the full amount
                            gApp.projectStore = Ext.create('Rally.data.wsapi.Store', {
                                model: 'Project',
                                autoLoad: true,
                                fetch: true,
                                filters: Rally.data.wsapi.Filter.or(projFilters),
                                listeners: {
                                    load: function(store, data, success) {
                                        if ( success) { gApp._defineUsersInvolved(data);}
                                        else { console.log('Oops!', arguments);}
                                    }
                                }
                            });
                        }
                    }
                }
            }
        });
    },

    _redraw: function(userCapEntries) {

        //TODO: Clear out all old data and drawings

        if (userCapEntries.length === 0 ) {
            Rally.ui.notify.Notifier.showError( { message: 'No user capacities set for Iteration(s) selection'});
            return;
        }

        //Create a tree for each user and sum the capacities against estimates 
        var treeRoots = [];
        _.each(_.uniq(userCapEntries, 'user'), function(entry) {
            treeRoots.push({
                name: entry.user,
                ref: entry.userRef,
                children: [],
                capacity: 0,
                actuals: 0,
                taskEstimate: 0
            });
        });

        _.each(userCapEntries, function(entry) {
            var user = _.find(treeRoots,{ 'ref': entry.userRef});
            if (user) {
                var childProj =  {
                    name: entry.project,
                    capacity: 0,
                    actuals: 0,
                    taskEstimate: 0,
                    iterations: []
                };
                _.each(entry.iterations, function(iteration) {
                    childProj.iterations.push({
                        name: iteration.name,
                        capacity: iteration.capacity,
                        actuals: iteration.actuals,
                        taskEstimate: iteration.taskEstimate
                    });
                });
                user.children.push(childProj);
            }
        });
        gApp._drawTree( 
            {
                name: 'All Node and Sub-Node Team Members',
                children: treeRoots
            }
        );
    },

    _defineUsersInvolved: function(records) {
        //Extract team members and give each of them a project record
        var promises = [];
        _.each(records, function(record) {
            if (record.get('TeamMembers').Count > 0) {
                promises.push(
                    record.getCollection('TeamMembers').load( {
                        fetch: true,
                    })
                );
            }
        });
        if (promises.length) {
            Deft.Promise.all(promises). then ( {
                success: function(arraysOfTeams)  { 
                    //Each entry of arraysOfTeams is itself an array of users. Each user entry has a data record
                    //for the user and a store record which references the Project. We need to scan these and 
                    //generate an array like this:
                    // { user, project, [iteration loads]}
                    var userCapEntries = [];
                    _.each(arraysOfTeams, function (teammembers) {
                        _.each(teammembers, function(member) {
                            gApp.allUsers.push(member);
                            userCapEntries.push(
                                {
                                    user: member.get('_refObjectName'),
                                    userRef: member.get('_ref'),
                                    project: member.store.config.record.get('_refObjectName'),
                                    projectRef: member.store.config.record.get('_ref'),
                                    iterations: Ext.clone(gApp.columnConfig)
                                }
                            );
                        });
                    });

                    gApp.allUsers = _.uniq(gApp.allUsers, 'ObjectID');

                    gApp._doUserIterationCapacities(userCapEntries). then ( {
                        success: function(records) {
                            //Fill in the userCapEntries table here
                            _.each(records, function(record) {
                                var entry = _.find(userCapEntries, function( capEntry) {
                                    return (( capEntry.userRef === record.get('User')._ref) && 
                                        ( capEntry.projectRef === record.get('Project')._ref));
                                });
                                if (entry) {
                                    var iteration = _.find(entry.iterations, function(iteration) {
                                        return (iteration.name === record.get('Iteration')._refObjectName);
                                    });
                                    if (iteration) {    //Could have filtered away some iterations above
                                        iteration.capacity = record.get('Capacity');
                                        iteration.taskEstimate = record.get('TaskEstimates');
                                    }
                                }
                            });
                            
                            //TODO: Jump off and get actuals first?????
                            if ( gApp.getSetting('filterCapacities') === true) {
                                gApp._redraw(_.filter( _.sortBy(userCapEntries, ['user', 'project']), function( entry) {
                                    //Check if any iteration has an entry
                                    return _.find( entry.iterations, function(iteration) {
                                        return (iteration.capacity > 0);
                                    });
                                }));
                            } else {
                                gApp._redraw(_.sortBy(userCapEntries, ['user', 'project']));
                            }
                        },
                        failure: function() {
                            console.log('Oops!', arguments);
                        }
                    });

                    
                }
            });
        }
    },

    _doUserIterationCapacities: function(userCapEntries) {

        var deferred = Ext.create('Deft.Deferred');

        var users = _.uniq(userCapEntries, 'user');
        var userFilters = [];
        _.each(users, function(user) {
            userFilters.push ( {
                property: 'User',
                value: user.userRef
            });
        });
        Ext.create('Rally.data.wsapi.Store',{
            model: 'UserIterationCapacity',
            filters: Rally.data.wsapi.Filter.or(userFilters),
            context: gApp.getContext().getDataContext(),
            autoLoad: 'true',
            listeners: {
                load: function(store, records, success) {
                    if (success) { deferred.resolve(records);}
                    else { deferred.reject();}
                }
            },
            fetch: ['Iteration', 'Project', 'Summary', 'Capacity', 'User', 'Load', 'TaskEstimates']
        });
        return deferred.promise;
    },

    initComponent: function() {

        this.addEvents('columnsReady', 'iterationsReady', 'projectsReady');
        this.callParent(arguments);
    },

    _applyProjectFilters: function() {
        //For each projct in the store, traverse up the hierachy to see if it is a child of ours
        //If you get to the top and haven't seen our project, then reject it.
        //This is going to be very painful for large organisations with big project hierarchies
    },

    listeners: {
        projectsReady: function() {
            this._applyProjectFilters();
        },
        columnsReady: function() {
            this._getProjectsList();
        },
        iterationsReady: function() {
            this._defineDefaultColumnConfig();
        }
    },

    launch: function() {
        //Write app code here

        //API Docs: https://help.rallydev.com/apps/2.1/doc/
    }
});
}());