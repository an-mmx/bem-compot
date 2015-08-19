(function (BEM, $) {

    var storageKey = '__' + (Date.now() * Math.random()) + 'compot',
        blockEventsKey = '__' + (Date.now() * Math.random()) + 'compot',
        decls = {},
        blockSelectorCache = {},
        DOM = BEM.DOM || BEM,
        INTERNAL = BEM.INTERNAL,
        COMPOT,

        bemJsonDecl = {
            onBlock: function (ctx) {
                ctx.defer(
                    COMPOT.create(ctx.params().block, ctx.js())
                    .toHtml()
                    .then(function (html) {
                        ctx.wrap([html]);
                    })
                );
            }
        },

        bemDomDecl = {
            onSetMod: {js: function () {
                var cmp = COMPOT.create(this.__self.getName(), this.params, this);
                COMPOT.BlockEvents().subscribe(cmp);
            }},

            destruct: function () {
                var cmp = this.getCmp();
                COMPOT.BlockEvents().unsubscribe(cmp);
                cmp.destruct();
                return this.__base.apply(this, arguments);
            },

            getCmp: function () {
                return COMPOT.byId(this.params.id);
            }
        };

    function LiveBlockEvents() {
        var inst = LiveBlockEvents.__inst;

        if (inst) {
            return inst;
        }

        if (this instanceof LiveBlockEvents) {
            this[blockEventsKey] = {};

            return inst = LiveBlockEvents.__inst = this;
        }

        return new LiveBlockEvents();
    }

    LiveBlockEvents.prototype = {
        subscribe: function (cmp) {
            var that = this;

            cmp[blockEventsKey] = {};
            Object.keys(cmp.events || {}).forEach(function (path) {
                var selector = parseBlockSelector(path);

                Object.keys(cmp.events[path] || {}).forEach(function (event) {
                    var eventKey = that._genEventKey(selector.block, event),
                        handler = cmp.events[path][event];

                    if (!that[blockEventsKey][eventKey]) {
                        that[blockEventsKey][eventKey] = [];
                        DOM.blocks[selector.block].on(event, that._handle, that);
                    }
                    that[blockEventsKey][eventKey].push(cmp);

                    if (!cmp[blockEventsKey][eventKey]) {
                        cmp[blockEventsKey][eventKey] = [];
                    }

                    handler = handler.fn ? handler : {fn: handler};
                    cmp[blockEventsKey][eventKey].push({
                        fn: handler.debounce
                            ? $.debounce(cmp[handler.fn], handler.debounce)
                            : handler.throttle
                                ? $.throttle(cmp[handler.fn], handler.throttle)
                                : cmp[handler.fn],
                        path: path,
                        data: handler.data
                    });
                });
            });
        },

        unsubscribe: function (cmp) {
            Object.keys(cmp[blockEventsKey]).forEach(function (eventKey) {
                this[blockEventsKey][eventKey] = this[blockEventsKey][eventKey].filter(function (cmp) {
                    return cmp !== this;
                }, cmp);
            }, this);
            cmp[blockEventsKey] = {};
        },

        _handle: function (e) {
            var args = [].slice.call(arguments),
                block = e.block,
                elem = block.domElem,
                eventKey = this._genEventKey(block.__self.getName(), e.type);

            this[blockEventsKey][eventKey].forEach(function (cmp) {
                cmp[blockEventsKey][eventKey].forEach(function (handler) {
                    var selector = parseBlockSelector(handler.path),
                        path = selector.start + ' ' + selector.path,
                        cmpSelector = '.' + cmp.__self.getName();

                    if ((elem.is(cmpSelector + ' ' + path) || elem.is(cmpSelector + path))
                    && cmp.block.domElem.filter(elem.closest(cmpSelector)).length) {
                        handler.fn.apply(cmp, args.concat(handler.data));
                    }
                });
            }, this);
        },

        _genEventKey: function (blockName, eventName) {
            return blockName + '.' + eventName;
        }
    };

    function parseBlockSelector(path) {
        if (blockSelectorCache[path]) {
            return blockSelectorCache[path];
        }

        var selectors = path.split(' '),
            regexp = /\[([^=]+)=([^\]]+)\]/g,
            blockName;

        selectors = selectors.reduce(function (all, selector) {
            blockName = selector.replace(regexp, '');

            all.push('.' + selector.replace(regexp, function (undefined, name, val) {
                return '.' + INTERNAL.buildClass(blockName, name, val);
            }));

            return all;
        }, []);

        return blockSelectorCache[path] = {
            block: blockName,
            start: selectors.shift(),
            path: selectors.join(' ')
        };
    }


    decls._base = $.inherit(
    /* prototype props */
    {
        /**
         * Component's block
         * @type {BEM.DOM}
         */
        block: null,

        /**
         * Component id
         * @type {String}
         */
        id: null,

        /**
         * Block container
         * @type {jQuery|String}
         */
        renderTo: null,

        /**
         * Bem blocks to be linked
         * @type {Object}
         */
        views: null,

        /**
         * bem block events to be listened
         * @type {Object}
         */
        events: null,

        /**
         * models to be linked and listened
         * @type {Object}
         */
        models: null,

        /**
         * @type {bemjson|function}
         * @returns {bemjson|Vow.promise}
         */
        template: '',

        __constructor: function (params) {
            params = params || {};
            this.id = params.id = params.id || $.identify();
            COMPOT[storageKey][this.id] = this;
            this.init(params);
            $.extend(this, params);
            if (this.renderTo) {
                this.appendTo(this.renderTo).done();
            }
        },

        /**
         * Init handler
         * Called during component initialization, before it will be rendered
         *
         * @abstract
         * @param {Object} Component params
         */
        init: function () {
            console.log(' -> initing ');
        },

        /**
         * Destructs block
         */
        destruct: function () {
            if (this._isRedrawing || this._isDestructing) {
                return;
            }

            this._isDestructing = 1;
            console.log(' -> destructing ');
            if (this.block) {
                DOM.destruct(this.block.domElem);
            }
            COMPOT[storageKey][this.id] = null;
            for (var i in this) {
                if (this.hasOwnProperty(i)) {
                    this[i] = null;
                }
            }
        },

        /**
         * Converts template to bemjson
         *
         * @param {String} [view] View to be created
         * @returns {Vow.promise}
         */
        toBemJson: function (view) {
            var tpl = this._getTpl(view),
                name = this.__self._name,
                id = this.id,
                promise;

            if (typeof tpl === 'function') {
                tpl = tpl.call(this);
            } else if (typeof tpl === 'object') {
                tpl = $.extend(true, tpl);
            }

            if (Vow.isPromise(tpl)) {
                promise = tpl;
            } else {
                promise = Vow.fulfill(tpl);
            }

            if (view) {
                return promise;
            }

            return promise.then(function (json) {
                json = [].concat(json);
                json.forEach(function (block) {
                    block.mix = [].concat(block.mix || [], {
                        block: name, js: {id: id}
                    });
                });

                return json;
            });
        },

        /**
         * Converts template to html
         *
         * @param {String} [view] View to be created
         * @returns {Vow.promise}
         */
        toHtml: function (view) {
            return this.toBemJson(view)
                .then(this._2html);
        },

        /**
         * Converts template to jquery element
         *
         * @param {String} [view] View to be created
         * @returns {Vow.promise}
         */
        toDom: function (view) {
            return this.toHtml(view)
                .then(function (html) {
                    return $(html);
                });
        },

        /**
         * Completed redraw of component
         *
         * @param {String} [view] View to be redrawed
         * @returns {Vow.promise}
         */
        redraw: function (view) {
            var that = this,
                block;

            if (view) {
                // @todo check for nested blocks - they can't be redrew
                block = this['get' + view.charAt(0).toUpperCase() + view.slice(1)];
                block = block && block.call(this);
            } else {
                block = this.block;
            }

            if (!block) {
                return Vow.reject(new Error('Can\'t redraw - view doesn\'t exists'));
            }

            return this.toDom(view)
                .then(function (dom) {
                    that._isRedrawing = 1;
                    DOM.replace(block.domElem, dom);
                    that._isRedrawing = 0;
                });
        },

        /**
         * Finds block by block-selector
         *
         * @param {String} path Block selector
         * @returns {BEM.DOM}
         */
        findBlock: function (path) {
            return this._findBlocks(path, true);
        },

        /**
         * Finds blocks by block-selector
         *
         * @param {String} path Block selector
         * @returns {BEM.DOM[]}
         */
        findBlocks: function (path) {
            return this._findBlocks(path);
        },

        /**
         * Appends component's to given element
         *
         * @param {jQuery|Element|String} ctx Element or selector
         * @returns {Vow.promise}
         */
        appendTo: function (ctx) {
            return this._domMethod(ctx, 'append');
        },

        /**
         * Prepends component's block to given element
         *
         * @param {jQuery|Element|String} ctx Element or selector
         * @returns {Vow.promise}
         */
        prependTo: function (ctx) {
            return this._domMethod(ctx, 'prepend');
        },

        /**
         * Inserts component's block after given element
         *
         * @param {jQuery|Element|String} ctx Element or selector
         * @returns {Vow.promise}
         */
        after: function (ctx) {
            return this._domMethod(ctx, 'after');
        },

        /**
         * Inserts component's block before given element
         *
         * @param {jQuery|Element|String} ctx Element or selector
         * @returns {Vow.promise}
         */
        before: function (ctx) {
            return this._domMethod(ctx, 'before');
        },

        /**
         * Replaces given element with component's block
         *
         * @param {jQuery|Element|String} ctx Element or selector
         * @returns {Vow.promise}
         */
        replace: function (ctx) {
            return this._domMethod(ctx, 'replace');
        },

        /**
         * Replaces given element's content with component's block
         *
         * @param {jQuery|Element|String} ctx Element or selector
         * @returns {Vow.promise}
         */
        update: function (ctx) {
            return this._domMethod(ctx, 'update');
        },

        /**
         * Creates html and execute BEM.DOM method to display it
         *
         * @param {jQuery|Element|String} ctx Element or selector
         * @returns {Vow.promise}
         */
        _domMethod: function (ctx, method) {
            var promise = this.block && this.block.domElem
                ? Vow.fulfill(this.block.domElem)
                : this.toHtml();

            return promise.then(function (html) {
                if (typeof ctx === 'string') {
                    ctx = $(ctx);
                }
                DOM[method](ctx, html);
            }.bind(this));
        },

        /**
         * Retrieves template
         *
         * @param {String} [view] View name
         * @returns {bemjson|Function}
         */
        _getTpl: function (view) {
            return view ? this[view + 'Template'] : this.template;
        },

        /**
         * Converts bemjson to html
         *
         * @param {BEMJSON} bemjson
         * @returns {Vow.promise}
         */
        _2html: function (bemjson) {
            return BN('i-content').html(bemjson);
        },

        /**
         * Finds block(s) inside component by given path
         *
         * @param {String} path Block selector string
         * @param {Boolean} [isOne=false] If true, will return only first block
         * @returns {BEM.DOM|null}
         */
        _findBlocks: function (path, isOne) {
            var block = this.block,
                selector,
                elems;

            if (block) {
                selector = parseBlockSelector(path);
                elems = block.domElem;
                elems = elems.filter(selector.start).add(elems.find(selector.start));
                if (selector.path) {
                    elems = elems.find(selector.path);
                }
            }

            if (!elems || !elems.length) {
                return null;
            }

            if (isOne) {
                return elems.eq(0).bem(selector.block);
            } else {
                return [].map.apply(elems, function (elem) {
                    return $(elem).bem(selector.block);
                });
            }
        }

    },

    /* static props */
    {
        /**
         * Get component name
         *
         * @static
         * @returns {String}
         */
        getName: function () {
            return this._name;
        }
    });


    /**
     * Retrieves component class by name
     *
     * @param {String} name Component name
     * @returns {BEM.COMPOT}
     */
    BEM.COMPOT = COMPOT = $.extend(function (name) {
        return decls[name];
    },
    {
        /**
         * Events controller
         * Handle block events and delegates them to components
         *
         * @type {Function}
         */
        BlockEvents: LiveBlockEvents,

        /**
         * Stores component declarations
         *
         * @type {Object}
         */
        components: decls,

        /**
         * Declare component
         *
         * @param {String|Object} decl Component name or declaration
         * @param {String} decl.name Component name
         * @param {String[]} [decl.mixins] Component mixins
         * @param {Object} [protoProps] Prototype properties
         * @param {Object} [staticProps] Static properties
         */
        decl: function (decl, protoProps, staticProps) {
            var base, events;

            protoProps = protoProps || {};
            staticProps = staticProps || {};

            if (typeof decl === 'string') {
                decl = {name: decl};
            }

            base = decls[decl.name];
            events = base && base.prototype && base.prototype.events || {};
            if (decl.mixins) {
                base = decl.mixins.reduce(function (base, mixin) {
                    if (!decls[mixin]) {
                        throw new Error('Mixin ' + mixin + ' for component ' + decl.name + ' doesn\'t exist');
                    }
                    events = $.extend(true, events, decls[mixin].prototype.events);
                    return $.inherit(base, decls[mixin].prototype, decls[mixin]);
                }, base || function () {});
            } else {
                base = base || decls._base;
            }

            // for the first time declaration
            if (!decls[decl.name]) {
                this._onFirstDecl(decl, protoProps, staticProps);
            }

            protoProps.events = $.extend(true, events, protoProps.events);

            if (protoProps.views) {
                this._genViewGetters(decl, protoProps);
            }

            return decls[decl.name] = $.inherit(base, protoProps, staticProps);
        },

        /**
         * Creates component
         *
         * @param {String} name Component name
         * @param {Object} params Component params
         * @param {BEM.DOM} [bemBlock]
         * @returns {BEM.COMPOT}
         */
        create: function (name, params, bemBlock) {
            var cmp;

            if (params && params.id) {
                cmp = COMPOT.byId(params.id);
            }

            if (!cmp) {
                cmp = new decls[name](params);
            }

            if (bemBlock) {
                cmp.block = bemBlock;
            }

            return cmp;
        },

        /**
         * Gets inited component by id
         *
         * @param {String} id Component id
         * @returns {BEM.COMPOT}
         */
        byId: function (id) {
            return COMPOT[storageKey][id];
        },

        _onFirstDecl: function (decl, protoProps, staticProps) {
            BEM.JSON.decl(decl.name, bemJsonDecl);
            DOM.decl(decl.name, bemDomDecl);
            staticProps._name = decl.name;
        },

        _genViewGetters: function (decl, protoProps) {
            Object.keys(protoProps.views)
                .forEach(function (key) {
                    var view = protoProps.views[key];

                    protoProps['get' + key.charAt(0).toUpperCase() + key.slice(1)] = function () {
                        return this.findBlock(view);
                    };
                });
        }

    });

    COMPOT[storageKey] = {};

}(BEM, jQuery));

