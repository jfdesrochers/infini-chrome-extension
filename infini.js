_ = chrome.i18n.getMessage

var limit = function(o, n) {
    if (o.length <= n) return o;
    let trimmedString = o.substr(0, n);
    trimmedString = trimmedString.substr(0, Math.min(trimmedString.length, trimmedString.lastIndexOf(" "))) + '...'
    return trimmedString
}

/**
 * Create a getter-setter property
 * Usage: let myprop = Property('Initial Value');
 * Set / Change Value: myprop('New Value');
 * Get Value: console.log(myprop()); // Returns 'New Value'
 * If defined, callback will be called when the value is changed with the params (newValue, oldValue) return false to cancel the value change.
 * @constructor
 * @param {*} defaultProp - Default value for the property. Mandatory.
 * @param {function} callback - Callback to be called if the property is changed.
 */
const Property = function (defaultProp, callback) {
    let curValue = defaultProp
    return function (propValue) {
        if (propValue !== undefined) {
            let oldValue = curValue
            if (typeof callback === 'function') {
                if (callback(propValue, oldValue) === false) {
                    return curValue
                }
            }
            curValue = propValue
        }
        return curValue
    }
}

var Infini = {};

Infini.oninit = function () {
    var self = this;
    self.isProductPage = /product_\d+_/gi.test(location.href) || /\/product/gi.test(location.href);
    self.productData = {};
    self.sidebarOpen = false;
    self.downloader = null;
    self.uploader = null;
    if (self.isProductPage) {
        if (/staplespromoproducts/gi.test(location.href)) {
            self.productData.title = document.querySelector('#container-print > table > tbody > tr:first-child > td:nth-child(2) > table > tbody > tr:first-child > td > b').textContent;
            self.productData.imgUrl = document.querySelector('#container-print > table > tbody > tr:first-child > td:first-child img').src
            self.productData.sku = document.querySelector('#container-print > table > tbody > tr:first-child > td:nth-child(2) > table > tbody > tr:nth-child(2) > td:nth-child(2)').textContent;
            self.productData.model = self.productData.sku;
        } else {
            self.productData.title = document.querySelector('h1').textContent;
            self.productData.imgUrl = document.querySelector('.stp--sku-image').src
            self.productData.sku = document.querySelector('.item-subtitle > li:nth-child(1) > span').textContent;
            self.productData.model = document.querySelector('.item-subtitle > li:nth-child(2) > span').textContent;
        }
    }

    self.listBanner = {title: '', subtitle: ''};
    self.productList = {};
    chrome.storage.sync.get(null, function (items) {
        if ('productlist' in items) {
            self.productList = items['productlist'];
        }
        if ('listbanner' in items) {
            self.listBanner = items['listbanner'];
        }
        m.redraw();
    });

    self.addCurrentItem = function (e) {
        e.preventDefault();
        if (!self.isProductPage) return;
        self.productList[self.productData.sku] = {
            title: self.productData.title,
            model: self.productData.model,
            imgUrl: self.productData.imgUrl
        };
        chrome.storage.sync.set({productlist: self.productList});
        document.querySelector('#InfiniRoot .badge').classList.add('peak');
        setTimeout(function () {document.querySelector('#InfiniRoot .badge').classList.remove('peak');}, 500);
    }

    self.changeBanner = function (kind) {
        return function (newValue) {
            self.listBanner[kind] = newValue;
        }
    }

    self.saveBanner = function (e) {
        chrome.storage.sync.set({listbanner: self.listBanner});
    }

    self.loadFromFile = function (f) {
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            var j = JSON.parse(e.target.result);
            self.productList = j.productList;
            self.listBanner = j.listBanner;
            chrome.storage.sync.set({productlist: self.productList, listbanner: self.listBanner});
            self.uploader.value = '';
            m.redraw();
        }
        reader.readAsText(f);
    }

    self.loadList = function (e) {
        e.preventDefault();
        self.uploader.click();
    }

    self.saveList = function (e) {
        e.preventDefault();
        var savename = prompt(_('savenameprompt'), '');
        if (savename != null) {
            // Remove previous Object URL, if necessary
            URL.revokeObjectURL(self.downloader.href);
            // Create new Object URL and download
            var j = {productList: self.productList, listBanner: self.listBanner}
            self.downloader.href = URL.createObjectURL(new Blob([JSON.stringify(j)], {'type': 'application/json'}));
            self.downloader.download = savename + '.infini';
            self.downloader.click();
        }
    }

    self.clearList = function (e) {
        e.preventDefault();
        if (!confirm(_('clearlistprompt'))) return;
        self.productList = {};
        self.listBanner = {title: '', subtitle: ''};
        chrome.storage.sync.set({productlist: self.productList});
    }

    self.refreshImage = function (e) {
        e.preventDefault();
        if (self.isProductPage) {
            if (/staplespromoproducts/gi.test(location.href)) {
                self.productData.imgUrl = document.querySelector('.prod-img').src
            } else {
                self.productData.imgUrl = document.querySelector('.stp--sku-image').src
            }
            if (self.productData.sku in self.productList) {
                self.productList[self.productData.sku].imgUrl = self.productData.imgUrl;
                chrome.storage.sync.set({productlist: self.productList});
            }
        }
    }

    self.toggleSidebar = function (e) {
        self.sidebarOpen = !self.sidebarOpen;
        e.preventDefault();
    }

    self.removeItem = function (item) {
        return function (e) {
            e.preventDefault();
            delete self.productList[item];
            chrome.storage.sync.set({productlist: self.productList});
            document.querySelector('#InfiniRoot .badge').classList.add('peak');
            setTimeout(function () {document.querySelector('#InfiniRoot .badge').classList.remove('peak');}, 500);
        }
    }

    self.generateList = function (e) {
        e.preventDefault();
        chrome.runtime.sendMessage({action: "openresults"}, function (response) {
            if (response) {
                console.log('Background page reported: %s', response.status);
            } else if (chrome.runtime.lastError) {
                console.log('Background page reported error: %s', chrome.runtime.lastError.message);
            }
        });
    }

    chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (key in changes) {
            if (key == 'productlist') {
                self.productList = changes[key].newValue;
                m.redraw();
            } else if (key == 'listbanner') {
                self.listBanner = changes[key].newValue;
                m.redraw();
            }
        }
    });
}

Infini.view = function () {
    var self = this;
    return [
        m('div.invisible', [
            m('input[type="file"]#uploader', {oncreate: function (vnode) {
                self.uploader = vnode.dom;
                self.uploader.accept = '.infini';
                self.uploader.addEventListener('change', function (e) {
                    self.loadFromFile(e.target.files[0]);
                })
            }}),
            m('a#downloader', {oncreate: function (vnode) {
                self.downloader = vnode.dom;
            }})
        ]),
        m('div.mainbar', [
            m('img.logo.baritem-left', {src: chrome.runtime.getURL(_('titlefilename'))}),
            self.isProductPage ? m('div.pageitem', [
                m('div.itempic', [
                    m('img.logo', {src: self.productData.imgUrl}),
                    m('div.overlay', {onclick: self.refreshImage}, m('div.fa.fa-refresh'))
                ]),
                m('div.itembody', [
                    m('div.title', self.productData.title),
                    m('div.sku', _('itemlabel') + self.productData.sku),
                    m('div.model', _('modellabel') + self.productData.model)
                ]),
                self.productData.sku in self.productList ? 
                m('div.itembody.addedbtn', [
                    m('div.fa.fa-2x.fa-check-square-o'),
                    m('div.caption', _('addedlabel'))
                ]) :
                m('a[href="#"].itembody.addbtn', {onclick: self.addCurrentItem}, [
                    m('div.fa.fa-2x.fa-plus-square-o'),
                    m('div.caption', _('addbtnlabel'))
                ])
            ]) : "",
            m('a[href="#"].baritem-right.listmenubtn', {onclick: self.toggleSidebar}, [
                m('div.listbody', [
                    m('div.badge', Object.keys(self.productList).length)
                ]),
                m('div.listbody', [
                    m('div.fa.fa-chevron-' + (self.sidebarOpen ? 'right' : 'left'))
                ])
            ])
        ]),
        self.sidebarOpen ? m('div.sidebar', {
            onbeforeremove: function(vnode) {
                return new Promise(function(resolve) {
                    vnode.dom.classList.add('close');
                    setTimeout(resolve, 1000);
                })
            }
        }, [
            m('ul.sidebar-group', [
                m('li.sidebar-item', [
                    m('label', _('titlelabel')),
                    m('input.form-control#infini-title', {
                        type: 'text',
                        onkeyup: m.withAttr('value', self.changeBanner('title')),
                        onchange: self.saveBanner,
                        value: self.listBanner.title
                    })
                ]),
                m('li.sidebar-item', [
                    m('label', _('subtitlelabel')),
                    m('input.form-control#infini-subtitle', {
                        type: 'text',
                        onkeyup: m.withAttr('value', self.changeBanner('subtitle')),
                        onchange: self.saveBanner,
                        value: self.listBanner.subtitle
                    })
                ])
            ]),
            m('div.list-wrapper', m('ul.sidebar-group', [
                Object.keys(self.productList).map(function (k) {
                    return m('div.pageitem', {key: k, onbeforeremove: function(vnode) {
                        return new Promise(function (resolve) {
                            vnode.dom.classList.add('remove');
                            setTimeout(resolve, 500);
                        })
                    }},[
                        m('div.itempic', m('img.logo', {src: self.productList[k].imgUrl})),
                        m('div.itembody', [
                            m('div.title', self.productList[k].title),
                            m('div.sku', 'Item: ' + k)
                        ]),
                        m('div.itembody.deletebtn', {onclick: self.removeItem(k)},m('span.fa.fa-times-circle'))
                    ])
                })
            ])),
            m('ul.sidebar-group', [
                m('li.sidebar-item.btn-group', [
                    m('div.flex-group', [
                        self.downloader ? m('button.button.btn-sm', {onclick: self.saveList}, [m('span.fa.fa-download'), _('savebtnlabel')]) : '',
                        self.uploader ? m('button.button.btn-sm', {onclick: self.loadList}, [m('span.fa.fa-upload'), _('loadbtnlabel')]) : '',
                        m('button.button.btn-sm', {onclick: self.clearList}, [m('span.fa.fa-trash'), _('emptylistlabel')])
                    ])
                ]),
                m('li.sidebar-item.btn-group', [
                    m('button.button.btn-block', {onclick: self.generateList}, [m('span.fa.fa-bolt'), _('generatelabel')])
                ])
            ])
        ]) : ''
    ]
}

var root = document.createElement('div');
root.id = "InfiniRoot";
document.body.appendChild(root);
m.mount(root, Infini);
console.log(_('extloadedmessage'));
