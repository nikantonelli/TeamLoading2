(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * @private
     * This class specifies the definition for a row action column inside a Rally.ui.grid.Grid.
     * In general, this class will not be created directly but rather will be passed to the grid as part of a columnCfg:
     *
     *     columnCfgs: [
     *         {
     *             xtype: 'rallyrowactioncolumn',
     *             rowActionsFn: function (record) {
     *                 return [
     *                     {
     *                         xtype: 'rallyrecordmenuitemedit',
     *                         record: record
     *                     }
     *                 ];
     *             }
     *         }
     *     ]
     *
     */
    Ext.define('Niks.Apps.uicActionColumn', {
        alias: 'widget.uicactioncolumn',
        extend: 'Ext.grid.column.Column',

        inheritableStatics: {
            gearIconModelTypesBlacklist: ['build', 'builddefinition', 'change', 'changeset', 'program', 'project', 'scmrepository', 'testcaseresult', 'userprofile'],

            getRequiredFetchFields: function(grid) {
                return (grid.enableBulkEdit && ['Iteration']) || [];
            }
        },

        clientMetrics: {
            event: 'click',
            description: 'clicked gear menu'
        },

        /**
         * @property {Boolean} sortable False to disable sorting of this column
         *
         */
        sortable: false,
        /**
         * @property {Boolean} hideable False to disable hiding of column
         *
         */
        hideable: false,
        /**
         * @property {Boolean} resizable False to disable resizing of column
         *
         */
        resizable: false,
        /**
         * @property {Boolean} draggable False to disable reordering of a column
         *
         */
        draggable: false,
        /**
         * @property {Boolean} menuDisabled True to disable the column header menu containing sort/hide options
         *
         */
        menuDisabled: true,
        /**
         * @property {Number}
         *
         */
        flex: -1,
        minWidth: Ext.isIE9 ? 22 : 26,
        maxWidth: Ext.isIE9 ? 22 : 26,

        /**
         * @property {Boolean}
         * This column should not show up on print pages that include a printable grid
         */
        printable: false,

        tdCls: 'rally-cell-row-action',
        cls: 'row-action-column-header',

        config: {
            /**
             * @cfg {Function} rowActionsFn
             * @params record {Ext.data.Record} The record to be assigned to record menu items
             * A list of Rally.ui.menu.Menu#items objects that will be used as the row action options
             * Each row action can contain a predicate property which will be evaluated to see if the row action should be included
             * Usage:
             *      [
             *          {text: 'Move...', record: record, handler: function(){  // move this.record  }}
             *      ]
             */
            rowActionsFn: null,

            menuOptions: {},

            /**
             * @cfg {Object} scope The scope that the rowActionsFn is called with
             */
            scope: null
        },

        constructor: function() {
            this.callParent(arguments);
            this.renderer = this._renderGearIcon;
        },

        initComponent: function() {
            this.callParent(arguments);
            this.on('click', this._showMenu, this);
        },

        onDestroy: function() {
            if (this.menu) {
                this.menu.destroy();
                delete this.menu;
            }

            this.callParent(arguments);
        },

        /**
         * @private
         * @param value
         * @param metaData
         * @param record
         */
        _renderGearIcon: function(value, metaData, record) {
            debugger;
            metaData.tdCls = Rally.util.Test.toBrowserTestCssClass('row-action', Rally.util.Ref.getOidFromRef(record.get('_ref')));

            var gearIconHtml = '<div class="row-action-icon icon-gear"/>';
            if(record.self.typePath === 'recyclebinentry'){
                return record.get('updatable') ? gearIconHtml : '';
            }

            return _.contains(Niks.Apps.uicActionColumn.gearIconModelTypesBlacklist, record.self.typePath) ? '' : gearIconHtml;
        },

        /**
         * @private
         * @param view
         * @param el
         */
        _showMenu: function(view, el) {
            var selectedRecord = view.getRecord(Ext.fly(el).parent("tr")),
                checkedRecords = view.getSelectionModel().getSelection(),
                grid = view.panel,
                defaultOptions;

            defaultOptions = {
                cls: Rally.util.Test.toBrowserTestCssClass('row-gear-menu-' + selectedRecord.getId()) + ' row-gear-menu',
                view: view,
                context: grid.getContext(),
                record: selectedRecord,
                showInlineAdd: grid.enableInlineAdd,
                owningEl: el.parentElement,
                popoverPlacement: ['bottom', 'top'],
                rankRecordHelper: {
                    findRecordToRankAgainst: function(options) {
                        grid.findRankedRecord(options);
                    },
                    getMoveToPositionStore: function(options) {
                        return grid.getMoveToPositionStore(options);
                    }
                },
                onBeforeRecordMenuCopy: function(record) {
                    return grid.onBeforeRecordMenuCopy(record);
                },
                onRecordMenuCopy: function(copiedRecord, originalRecord, operation) {
                    return grid.onRecordMenuCopy(copiedRecord, originalRecord, operation);
                },
                onBeforeRecordMenuDelete: function(record) {
                    return grid.onBeforeRecordMenuDelete(record);
                },
                onRecordMenuDelete: function(record) {
                    return grid.onRecordMenuDelete(record);
                },
                onBeforeRecordMenuRankHighest: function(record) {
                    return grid.onBeforeRecordMenuRankHighest(record);
                },
                onBeforeRecordMenuRankLowest: function(record) {
                    return grid.onBeforeRecordMenuRankLowest(record);
                },
                onRecordMenuRemove: function(record) {
                    return grid.onRecordMenuRemove(record);
                },
                shouldRecordBeRankable: function(record) {
                    return grid.shouldRecordBeRankable(record);
                },
                shouldRecordBeExtremeRankable: function(record) {
                    return grid.shouldRecordBeExtremeRankable(record);
                }
            };

            if (grid.enableBulkEdit && _.contains(checkedRecords, selectedRecord)) {
                this.menu = Ext.create('Rally.ui.menu.bulk.RecordMenu', Ext.apply({
                    clientMetricsParent: grid,
                    context: grid.getContext(),
                    records: checkedRecords,
                    store: grid.store,
                    onBeforeAction: function() {
                        if (view.loadMask && _.isFunction(view.loadMask.disable)) {
                            view.loadMask.disable();
                        }
                        grid.setLoading('Updating...');
                        grid.suspendLayouts();
                    },
                    onActionComplete: function(successfulRecords, unsuccessfulRecords, changes) {
                        grid.refreshAfterBulkAction(successfulRecords, changes).then({
                            success: function() {
                                grid.resumeLayouts();
                                grid.setLoading(false);
                                if (view.loadMask && _.isFunction(view.loadMask.enable)) {
                                    view.loadMask.enable();
                                }
                                grid.getSelectionModel().deselect(successfulRecords);
                                grid.getSelectionModel().select(unsuccessfulRecords);
                                _.each(successfulRecords, grid.highlightRowForRecord, grid);
                                grid.publish(Rally.Message.bulkUpdate, successfulRecords, changes, grid);
                            }
                        });
                    }
                }, grid.bulkEditConfig));
            } else if (this.rowActionsFn) {
                this.menu = Ext.create('Rally.ui.menu.RecordMenu', Ext.apply({
                    items: this.rowActionsFn.call(this.scope || this, selectedRecord)
                }, defaultOptions));
            } else {
                this.menu = this._getDefaultRecordMenu(selectedRecord, defaultOptions);
            }

            this.menu.showBy(Ext.fly(el).down(".row-action-icon"));
        },

        _getDefaultRecordMenu: function(selectedRecord, defaultOptions) {
            var menu;
            var menuOptions = Ext.merge(defaultOptions, this.menuOptions || {});
            if (selectedRecord.self.typePath === 'testcase') {
                menu = Ext.create('Rally.ui.menu.TestCaseRecordMenu', menuOptions);
            } else if(selectedRecord.self.typePath === 'recyclebinentry') {
                menu = Ext.create('Rally.ui.menu.RecycleBinEntryRecordMenu', menuOptions);
            } else {
                menu = Ext.create('Rally.ui.menu.DefaultRecordMenu', menuOptions);
            }
            return menu;
        }
    });

})();