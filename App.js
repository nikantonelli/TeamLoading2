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
            itemId: 'filterBox',
            layout: {
                type: 'hbox',
                align: 'stretch'
            }
        },
        {  
            xtype: 'container',
            itemId: 'panelBox',
            maxWidth: 1200, //even if they ask for many columns, stop the button disappearing far off to the right
            layout: {
                type: 'vbox',
                align: 'stretch'
            }
        },
        {
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

    iterationList: [],
    allUsers: [],

    defaultTreeRoot: {
        Name: 'All Node and Sub-Node Team Members',
        children: [],
        taskEstimate: 0,
        capacity: 0
    },

    margin: {top: 30, right: 20, bottom: 30, left: 20},
    treewidth: 300,
    barHeight: 20,
    duration: 400,
    barIndent: 20,
    iterationColoumnWidth: 150,

    onSettingsUpdate: function() {
        gApp.fireEvent('kickOff');
    },

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

    _createSVGGroup: function() {
        if (gApp.svg) { 
            gApp.svg.transition()
            .duration(gApp.duration)
            .attr("transform", function() { return "translate(0,0)"; })
            .style("opacity", 0)
            .remove();
        }
        gApp.svg = d3.select('svg')
            .append("g")
                .attr("transform", "translate(" + gApp.margin.left + "," + gApp.margin.top + ")");
    },

    _onElementValid: function(rootSurface) {
        this._setSVGSize(rootSurface);
        this._createSVGGroup();

        //Add the sprint filters to the top box:
        var me = this;
        me.down('#filterBox').add({
            xtype: 'rallyiterationcombobox',
            fieldLabel: 'Choose Start Iteration:',
            labelWidth: 120,
            stateId: this.getContext().getScopedStateId('iteration-filter'),
            context: this.getContext(),
            margin: '5 5 5 5',
            stateful: true,
            maxWidth: 600,
            width: 600,
            itemId: 'iterCbx',
            listeners: {
                select: me._newSelection,
                ready: me._iterationLoad,
                scope: me
            }
        });

        var blackListFields = ['Successors', 'Predecessors', 'DisplayColor', 'Iteration'], //Don't allow Iterations filter
            whiteListFields = ['User'];

        var modelNames = ['UserIterationCapacity'];
        this.down('#filterBox').add({
            xtype: 'rallyinlinefiltercontrol',
           context: this.getContext(),
            height: 26,
            inlineFilterButtonConfig: {
                stateful: true,
                stateId: me.getContext().getScopedStateId('inline-filter'),
                context: me.getContext(),
                modelNames: modelNames,
                filterChildren: false,
                inlineFilterPanelConfig: {
                    quickFilterPanelConfig: {
                        defaultFields: ['User'],
                        addQuickFilterConfig: {
                            blackListFields: blackListFields,
                            whiteListFields: whiteListFields
                        }
                    },
                    advancedFilterPanelConfig: {
                        advancedFilterRowsConfig: {
                            propertyFieldConfig: {
                                blackListFields: blackListFields,
                                whiteListFields: whiteListFields
                            }
                        }
                    }
                },
                listeners: {
                    inlinefilterchange: me._onFilterChange,
                    inlinefilterready: me._onFilterReady,
                    scope: me
                }
            }
        });

        this.down('#filterBox').add({
            xtype: 'rallybutton',
            itemId: 'infoButton',
            margin: '5 5 5 5',
            align: 'right',
            text: 'Page Info',
            handler: function() {
                Ext.create('Rally.ui.dialog.Dialog', {
                    autoShow: true,
                    draggable: true,
                    closable: true,
                    width: 500,
                    autoScroll: true,
                    maxHeight: 600,
                    title: 'Information about this app',
                    items: {
                        xtype: 'component',
                        html: 
                            '<p class="boldText">User Iteration Capacities</p>' +
                            '<p>This app will find all the team members set up for this node and all child nodes. ' +
                            'This info is then arranged by person and then by the team they are a member of.</p>' +
                            '<p class="boldText">Choosing Iterations</p>' +
                            '<p>The app settings contains an option to allow you to set how many columns of iterations you want' +
                            ' to view at one time. You can then select the starting iteration from the drop-down selector at the top</p>' +
                            '<p class="boldText">Managing visibility</p>' +
                            '<p>The tree of boxes on the left are clickable to expand/collapse users. Using the Shift key whilst clicking on the ' +
                            'user will cause the expansion/collapsing of all the users nodes</p>' +
                            '<p>The boxes under the iteration name headers contain numbers which can be considered the current loading for that user' +
                            ' in that particular project node.</p>' +
                            '<p>If you click on the box, the app will list all the tasks associated with that box. If the box contains a "-" symbol, ' +
                            'it means that there are no capacity records for that user, for that iteration in that project. If the box contains a zero,' +
                            ' then there are records but it is most likely that there are no tasks yet assigned to that user (for that project and iteration)</p>' +
                            '<p>If you use the "alt" key while clicking on a user, you will be given a pop-up that allows you to view the capacity information' +
                            ' records for that user.</p>' +
                            '<p>Advanced Filters are not yet working, but will be soon. Keep checking back into the repo below</p>' +
                            '<p>Source code available here: <br/><a href=https://github.com/nikantonelli/TeamLoading2> Github Repo</a></p>',
                        padding: 10
                    }
                });
            }

        })

    },

    _onFilterReady: function(inlineFilterPanel) {
        this.down('#panelBox').add(inlineFilterPanel);
    },

    _onFilterChange: function(inlineFilterButton) {
        gApp.filterInfo = inlineFilterButton.getTypesAndFilters();
        //This can fire before the app has started up, so just try to catch that!
        if (gApp.down('#iterCbx').getRecord()) { 
             gApp._newSelection();
        }
    },

    _setSVGSize: function(surface) {
        var svg = d3.select('svg');
        svg.attr('width', surface.getEl().dom.clientWidth);
        svg.attr('height',surface.getEl().dom.clientHeight);
    },

    _newSelection: function(){
        //remove all the svg stuff and any tables and arrays stored in prep
        // me.iterationList gets trashed by _defineIterationList
        //gApp.svg should remain but all children should be removed
        gApp.treeRoot = Ext.clone(gApp.defaultTreeRoot);
        this._createSVGGroup();
        this.allUsers = [];
        this.fireEvent('kickOff');
    },

    _iterationLoad: function(){
        gApp.treeRoot = Ext.clone(gApp.defaultTreeRoot);
        this.fireEvent('kickOff');
    },

    _defineIterationList: function() {
        var me = this;
        /* We need to get the SVG pane, split it into columns: 
            1: Persons name
            2: Project in Question
            3-n: Iterations

            But we only need certain chosen
        */
       me.iterationList = [];

        //Find the iterations we need
        var store = gApp.down('#iterCbx').getStore();
        var startRecord = gApp.down('#iterCbx').getRecord().index;
        //Sort order is backwards for iterations
        for ( var j = 0, i = startRecord; (i >= 0) && ( j < gApp.getSetting('maxIterations')) ; --i, j++) {    
            me.iterationList.push({
                'record': store.getRecords()[i],
                'actuals': 0,        //Use this for summing the record later
                'taskEstimate': 0,
                'capacity': 0,
                'valid': false
            });
        }
        me.fireEvent('columnsReady');
    },

    _drawTree: function() {
        gApp.root = d3.hierarchy(gApp.treeRoot);
        _.each(gApp.root.leaves(), function(leaf) {
            gApp.root.data.capacity += leaf.data.capacity;
            gApp.root.data.taskEstimate += leaf.data.taskEstimate;
        });
        gApp.root.x0 = 0;
        gApp.root.y0 = 0;
        gApp._update(gApp.root);
    },
    
    colour: function (d) {
        if (!d.capacity) { return '#ffffff';}

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
        gApp.down('#rootSurface').setHeight(height);

        var diagonal = d3.linkHorizontal()
            .x(function(d) { return d.y; })
            .y(function(d) { return d.x; });

        gApp.svg.transition()
            .duration(gApp.duration)
            .attr("height", height)
            .attr("width", (gApp.iterationColoumnWidth * gApp.iterationList.length) +
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
            .style("fill", function(d) { return gApp.colour(d.data);})
            .on("click", function(d) {
                if (event.shiftKey) {
                    var state = d.children;
                    //Find the parent and close all the children (not the parent)
                    if (d.parent && d.parent.children) {
                        _.each(d.parent.children, function(child) {
                            if (state) {
                                gApp._minimise(child);
                            }
                            else {
                                gApp._maximise(child);
                            }
                        });
                        gApp._update(d);
                    }
                } else if (event.altKey) {
                    //Call up a grid for the UserIterationCapacities for this user
                    var cont = Ext.create( 'Ext.Container', {
                        floating: true,
                        items: [{
                            xtype: 'rallygrid',
                            margin: '0 5 0 5',
                            title: 'Capacity Settings for ' + d.data.record.get('_refObjectName'),
                            // bulkEditConfig: {
                            //     showEdit: false,
                            //     showTag: false,
                            //     showParent: false,
                            //     showRemove: false
                            // },
                            context: gApp.getContext(),
                            columnCfgs: [
                                {
                                    xtype: 'uicactioncolumn',
                                    rowActionsFn: function (record) {
                                        return [
                                            {
                                                xtype: 'uicMenu',
                                                record, record,
                                                iterations: gApp.iterationList
                                            }
                                        ]
                                    }
                                },
                                {
//                                    xtype: 'templatecolumn',
                                    text: 'Project',
                                    dataIndex: 'Project',
                                    editor: null
                                
                                //     tpl: Ext.create('Rally.ui.renderer.template.ObjectTemplate', {
                                //         extend: 'Ext.XTemplate',
                                //         fieldName: 'Project'
                                //     }),
                                //     field: {
                                //       xtype: 'rallyprojectpicker'
                                //     }
                                   },
                                'Iteration',
                                'Capacity',
                                'TaskEstimates',
                            ],
                            storeConfig: {
                                model: 'UserIterationCapacity',
                                filters: [
                                    {
                                        property: 'User',
                                        value: d.data.record.get('_ref')
                                    }
                                ],
                                listeners: {
                                    update: function() {  gApp._newSelection();},
                                }
                            },
                            listeners: {
                                show: function() { debugger;},
                            },
                            constrain: false,
                            width: 800,
                            height: 'auto',
                            resizable: true,
                            closable: true
                        }],
                        draggable: true
                    });
                    cont.show();
                }
                else {
                    gApp._click(d);
                }
                event.stopPropagation();
            // })            
            // .on("auxclick", function(d,a,b,c) {
            //     debugger;
            //     gApp._click(d)
            });
      
        nodeEnter.append("text")
            .attr("dy", 3.5)
            .attr("dx", 5.5)
            .text(function(d) { 
                return d.data.Name; 
            });
      
        //Now add all the iteration information on the end of the record
        nodeEnter.call( function(n) {
            var iterationGroup = nodeEnter.append('g')            
            .attr("transform", function(d) { 
                return "translate(" + (gApp.treewidth - (d.depth * gApp.barIndent)) + "," + (-gApp.barHeight / 2) + ")"; 
            });

            _.each( gApp.iterationList, function(column, index) {

                iterationGroup.append('text')
//                    .attr('dy', -gApp.margin.top)
                    .attr('dy', gApp.barHeight - 5)
                    .attr('dx', gApp.iterationColoumnWidth * (index + 0.5))
                    .style("text-anchor",  'middle')
                    .text( function(d) { 
                        var iteration = d.data.iterations ? d.data.iterations[index] : 0;
                        if ( iteration) {
                            return iteration.valid ?
                            iteration.capacity ? 
                                (Math.trunc((iteration.taskEstimate/iteration.capacity) * 10000)/100):0
                                : '-' ;
                        }
                        if (d.parent === null ) {
                            return gApp.iterationList[index].record.get('Name');
                        }
                        if (d.data.valid) {
                            //Sum up the particular iteration of all the children
                            childSum = {
                                taskEstimate: 0,
                                capacity: 0,
                                sumValid: false
                            };

                            _.each(d.children, function(child) {
                                var iteration = child.data.iterations ? child.data.iterations[index] : 0;
                                if ( iteration && iteration.valid) {
                                    childSum.taskEstimate += iteration.taskEstimate;
                                    childSum.capacity += iteration.capacity;
                                    childSum.sumValid = true;
                                }            
                            });

                            if (childSum.sumValid) {
                                return childSum.capacity ? 
                                    Math.trunc((childSum.taskEstimate/childSum.capacity) * 10000)/100:
                                0;
                            }
                        }
                        return '';
                    });

                iterationGroup.append("rect")
                    .style("fill", function(d) {
                            var iteration = d.data.iterations ? d.data.iterations[index] : 0;
                            if ( iteration) { return gApp.colour(iteration); }
                            if ( d.parent === null) { return '#ffffff';}
                            if (d.children) { return gApp.colour(d.data); }
                            return '#ffffff';   //Default if we fail the above tests
                        })
                    .attr("height", gApp.barHeight)
                    .attr('index', index)       //Store this away for retrieval later
                    .attr('x', index * gApp.iterationColoumnWidth)
                    .attr("width", gApp.iterationColoumnWidth)
                    .on('click', function(d,i,a) {
                        if (!d.children) {      //Only do this at the bottom

                            if (!d.cont) {
                                var contP = Ext.create( 'Ext.Container', {
                                    floating: true,
                                    items: [{
                                        xtype: 'rallygrid',
                                        margin: '5 5 5 5',
                                        title: 'Tasks for ' + d.parent.data.record.get('_refObjectName') +
                                            ', ' + d.data.iterations[index].record.get('_refObjectName') +
                                            ', ' + d.data.record.get('_refObjectName'),
                                        columnCfgs: [
                                            'FormattedID',
                                            'Name',
                                            'Owner',
                                            'Project',
                                            'Estimate',
                                            'ToDo'
                                        ],
                                        storeConfig: {
                                            model: 'task',
                                            filters: [
                                                {
                                                    property: 'Owner',
                                                    value: d.parent.data.record.get('_ref')
                                                },
                                                {
                                                    property: 'Iteration',
                                                    value: d.data.iterations[index].record.get('_ref')
                                                },
                                                {
                                                    property: 'Project',
                                                    value: d.data.record.get('_ref')
                                                }
                                            ]
                                        },
                                        listeners: {
                                            show: function() { debugger;}
                                        },
                                        constrain: false,
                                        width: 800,
                                        height: 'auto',
                                        resizable: true,
                                        closable: true
                                    }],
                                    draggable: true
                                });
                                contP.show();
                            }
                        }
                        else if ( d.parent) {   //Do this for the middle ones
                            var contI = Ext.create( 'Ext.Container', {
                                floating: true,
                                items: [{
                                    xtype: 'rallygrid',
                                    margin: '5 5 5 5',
                                    title: 'Tasks for ' + d.data.record.get('_refObjectName') +
                                        ', ' + gApp.iterationList[index].record.get('_refObjectName') ,
                                    columnCfgs: [
                                        'FormattedID',
                                        'Name',
                                        'Owner',
                                        'Project',
                                        'Estimate',
                                        'ToDo'
                                    ],
                                    storeConfig: {
                                        model: 'task',
                                        filters: [
                                            {
                                                property: 'Owner',
                                                value: d.data.record.get('_ref')
                                            },
                                            {
                                                property: 'Iteration',
                                                value: gApp.iterationList[index].record.get('_ref')
                                            }
                                        ]
                                    },
                                    listeners: {
                                        show: function() { debugger;}
                                    },
                                    constrain: false,
                                    width: 800,
                                    height: 'auto',
                                    resizable: true,
                                    closable: true
                                }],
                                draggable: true
                            });
                            contI.show();
                        }
                    });
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
            .style("fill", function(d) { return gApp.colour(d.data);});
      
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

    _minimise: function(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        }
    },
    _maximise: function(d) {
        if (!d.children) {
            d.children = d._children;
            d._children = null;
        }
    },

    _click: function(d) {
        if (d.children) {
            gApp._minimise(d);
        } else {
            gApp._maximise(d);
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
                value: project.ObjectID,
                property: 'ObjectID'
            },
            {
                value: project.ObjectID,
                property: 'Parent.ObjectID'
            },
            {
                value: project.ObjectID,
                property: 'Parent.Parent.ObjectID'
            },
            {
                value: project.ObjectID,
                property: 'Parent.Parent.Parent.ObjectID'
            },
            {
                value: project.ObjectID,
                property: 'Parent.Parent.Parent.Parent.ObjectID'
            },
            {
                value: project.ObjectID,
                property: 'Parent.Parent.Parent.Parent.Parent.ObjectID'
            },
            {
                value: project.ObjectID,
                property: 'Parent.Parent.Parent.Parent.Parent.Parent.ObjectID'
            },
            {
                value: project.ObjectID,
                property: 'Parent.Parent.Parent.Parent.Parent.Parent.Parent.ObjectID'
            }
        ];
//debugger;
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
                    _.each(arraysOfTeams, function (teammembers) {
                        _.each(teammembers, function(member) {
                            var userNode = _.find(gApp.treeRoot.children, function(child) {
                                return child.record.get('ObjectID') === member.get('ObjectID');
                            });

                            // If we don't already have this user in the tree, add it in.
                            if ( !userNode) {
                                userNode = {
                                    'Name' : member.get('_refObjectName'),
                                    'record' : member,
                                    'children' : [],
                                    'actuals' : 0,
                                    'taskEstimate' : 0,
                                    'capacity' : 0
                                };
                                gApp.treeRoot.children.push(userNode); 
                                gApp.treeRoot.children = _.sortBy(gApp.treeRoot.children, 'Name');   
                            }
                            //Now set up the project entries on those users
                            //The project for this member record is buried in the store
                            var project = member.store.config.record

                            var projNode = _.find(userNode.children, function(child) {
                                return child.record.get('ObjectID') === project.get('ObjectID');
                            });
                            if ( !projNode) {
                                projNode = {
                                    'Name' : project.get('_refObjectName'),
                                    'record' : project,
                                    'children' : [],
                                    'actuals' : 0,
                                    'taskEstimate' : 0,
                                    'capacity' : 0,
                                    'valid' : false, //Set this when we find an UserIterationCapacity entry
                                };
                                userNode.children.push(projNode);
                                userNode.children = _.sortBy(userNode.children, 'Name');
                            }
                        });
                    });

                    gApp._doUserIterationCapacities(). then ( {
                        success: function(records) {
                            //Fill in the iterations
                            _.each(records, function(record) {
                                //First find the user node in the tree
                                var userNode = _.find(gApp.treeRoot.children, function( un) {
                                    return ( un.record.get('_ref') === record.get('User')._ref);
                                });
                                //Then if we have one (should do as the code is architected this way)
                                if (userNode) {
                                    //Then find the project node
                                    var projNode = _.find(userNode.children, function(project) {
                                        return (project.record.get('_ref') === record.get('Project')._ref);
                                    });
                                    if (projNode) {
                                        //Check for whether the iteration is there
                                        if (!projNode.iterations) {
                                            projNode.iterations = Ext.clone(gApp.iterationList);
                                        }
                                        var iteration = _.find(projNode.iterations, function(iter) {
                                            return (iter.record.get('_refObjectName') === record.get('Iteration')._refObjectName);
                                        });
                                        if (iteration) {    //Could have filtered away some iterations above
                                            iteration.capacity += record.get('Capacity');
                                            iteration.taskEstimate += record.get('TaskEstimates');
                                            iteration.valid = true;
                                            projNode.capacity += record.get('Capacity');
                                            projNode.taskEstimate += record.get('TaskEstimates');
                                            projNode.valid = true;
                                            userNode.capacity += record.get('Capacity');
                                            userNode.taskEstimate += record.get('TaskEstimates');
                                            userNode.valid = true;
                                        }
                                    }
                                }
                            });
                            //TODO: Jump off and get actuals first?????
                            gApp._drawTree();
                        },
                        failure: function() {
                            console.log('Oops!', arguments);
                        }
                    });

                    
                }
            });
        }
    },

    _doUserIterationCapacities: function() {

        var deferred = Ext.create('Deft.Deferred');
        var userFilters = [];

        _.each(gApp.treeRoot.children, function(user) {
            userFilters.push ( {
                property: 'User',
                value: user.record.get('_ref')
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

        this.addEvents('columnsReady', 'kickOff', 'projectsReady');
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
        kickOff: function() {
            this._defineIterationList();
        }
    },

    launch: function() {
        //Write app code here

        //API Docs: https://help.rallydev.com/apps/2.1/doc/
    }
});
Ext.define('Rally.ui.bulk.RecordMenuFix', {
    override: 'Rally.ui.menu.bulk.RecordMenu',
    _getMenuItems: function() {
        var records = this.getRecords();
        var items = this.callParent(arguments);
        items.push({
            xtype: 'uicCopyTo',
            id: 'uicCopyTo'
        });

        // _.each(items, function(item) {
        //     Ext.apply(item, {
        //         records: records,
        //         store: this.store,
        //         onBeforeAction: this.onBeforeAction,
        //         onActionComplete: this.onActionComplete,
        //         context: this.getContext()
        //     });
        // }, this);

        return items;
    }
});

Ext.define('uicCopyTo', {
    alias: 'widget.uicCopyTo',

    config: {
        text: 'Copy To',
        handler: function(arg1, arg2, arg3) {
            this._chooseDestination();
        }
    },

    _chooseDestination: function() {
        debugger;
    }
});

}());