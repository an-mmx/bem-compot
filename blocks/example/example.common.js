/**
 * Hello world page
 */
BN.addDecl('example', 'page', {
    route: /^\/.*/
})
.staticProp({
    init: function () {
        return this.setTitle('Test BEM Components')
            .out([
                {block: 'c-example', js: {id: 'one'}},
                {tag: 'hr'},
                {block: 'c-extended-example', js: {id: 'two'}}
            ]);
    }
});


BEM.COMPOT.decl('c-example',
/* prototype declaration */
{

    // bem blocks to be linked
    views: {
        blockOne: 'test-block-1',
        secondBlock: 'test-block-2',
        input: 'input',
        blockThree: 'test-block',
        button: 'test-block button[size=s][action=foo]'
    },

    // bem block events to be listened
    events: {
        'test-block button[size=s][action=foo]': {
            click: '_onButtonClick'
        },
        input: {
            change: {
                debounce: 220,
                fn: '_onInputChange',
                data: 'q w e'
            }
        }
    },

    // promised models to be linked
    models: {
    },

    /**
     * @type {bemjson|function}
     * @returns {bemjson|Vow.promise}
     */
    template: function () {
        return {
            block: 'zero',
            content: [
                this.blockOneTemplate(),
                {block: 'test-block-2', content: this.inputTemplate()},
                this.blockThreeTemplate()
            ]
        };
    },

    blockOneTemplate: function () {
        return {block: 'test-block-1', content: Math.random() * Date.now()};
    },

    inputTemplate: function () {
        return Vow.fulfill({
            block: 'input',
            mods: {size: 's'},
            content: {elem: 'control'}
        });
    },

    blockThreeTemplate: function () {
        return Vow.fulfill({
            block: 'test-block', content: {
                block: 'button',
                mods: {size: 's', action: 'foo', disabled: 'yes'},
                content: 'press me'
            }
        });
    },

    _onButtonClick: function () {
        console.log(' -> _onButtonClick args: ', arguments);
        this.getBlockOne().domElem.html(this.getInput().val());
        this.getInput().val('');
    },

    _onInputChange: function () {
        console.log(' -> _onInputChange args: ', arguments);
        this.getButton().toggleMod('disabled', 'yes', !this.getInput().val());
    }
});


BEM.COMPOT.decl({name: 'c-extended-example', mixins: ['c-example']}, {

    views: {
        blockOne: 'block-one'
    },

    blockOneTemplate: function () {
        return {
            tag: 'div',
            content: [
                {tag: 'span', content: '[[[ '},
                {block: 'block-one', tag: 'span'},
                {tag: 'span', content: ' ]]]'}
            ]
        };
    },

    blockThreeTemplate: function () {
        return Vow.fulfill({
            block: 'test-block',
            content: [
                {
                    block: 'button',
                    mods: {size: 's'},
                    content: 'another button'
                },
                {
                    block: 'button',
                    mods: {size: 's', action: 'foo', disabled: 'yes'},
                    content: 'press me'
                },
                {
                    block: 'button',
                    mods: {size: 's'},
                    content: 'another button'
                }
            ]
        });
    }

});

