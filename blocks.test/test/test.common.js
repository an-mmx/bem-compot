//jshint ignore: start
/**
 * test page
 */
BN.addDecl('test', 'page', {
    route: /^/
}).staticProp({
    /**
     * @override {i-page}
     */
    init: function () {
        return this.out({
            block: 'test',
            js: true
        });
    },

    /**
     * @override {i-page}
     */
    update: function () {
        return Vow.reject();
    }

}).instanceProp({

    /**
     * @override {i-page}
     */
    init: function () {
        var expect = chai.expect;
        mocha.ui('bdd');
        mocha.reporter('html');
        this.test(expect);

        if (window.mochaPhantomJS) {
            mochaPhantomJS.run();
        } else {
            mocha.run();
        }
    },

    test: function (expect) {
        describe('BEM.COMPOT', function () {
            before(function () {
                BEM.COMPOT.decl('c-one', {
                    events: {
                        'input[type=radio]': {
                            click: '_handleClick'
                        }
                    },

                    _handleClick: function () {}
                });
                BEM.COMPOT.decl({name: 'c-eleven', mixins: ['c-one']}, {
                    events: {
                        'button[action=go]': {
                            press: '_handleButton'
                        }
                    },

                    _handleButton: function () {}
                });
            });
            after(function () {
                delete BEM.COMPOT.components['c-one'];
                delete BEM.COMPOT.components['c-eleven'];
            });
            describe('decl', function () {
                var one, eleven;

                it('should add component class to BEM.COMPOT.components', function () {
                    expect(BEM.COMPOT.components['c-one']).to.be.not.a('undefined');
                    expect(BEM.COMPOT.components['c-eleven']).to.be.not.a('undefined');
                });

                it('create', function () {
                    one = BEM.COMPOT.create('c-one', {id: 'one'});
                    eleven = BEM.COMPOT.create('c-eleven', {id: 'eleven'});

                    expect(one).to.be.an.instanceof(BEM.COMPOT.components['c-one']);
                    expect(eleven).to.be.an.instanceof(BEM.COMPOT.components['c-eleven']);
                });

                it('byId', function () {
                    expect(one).to.equal(BEM.COMPOT.byId('one'));
                    expect(eleven).to.equal(BEM.COMPOT.byId('eleven'));
                    expect(BEM.COMPOT.byId('one')).to.not.equal(BEM.COMPOT.byId('eleven'));
                });

                it('should inherit mixins', function () {
                    expect(eleven).to.be.an.instanceof(BEM.COMPOT.components['c-eleven']);
                    expect(eleven).to.be.an.instanceof(BEM.COMPOT.components['c-one']);
                });

                it('destruct', function () {
                    one.destruct();
                    eleven.destruct();

                    expect(BEM.COMPOT.byId('one')).to.be.null;
                    expect(BEM.COMPOT.byId('eleven')).to.be.null;
                });
            });
        });
    }

}).blockTemplate(function (ctx) {
    BN('i-page').addToHead([
        '<script src="/node_modules/mocha/mocha.js"></script>',
        '<link rel="stylesheet" href="/node_modules/mocha/mocha.css"/>',
        '<script src="/node_modules/chai/chai.js"></script>'
    ]);
    ctx.content('<div id="mocha"></div>');
});

