function gridify(self) {
    var results = [];
    var row = [];
    Object.keys(self.productList).forEach(function (k, i) {
        var item = m('div.col.centered.w25', [
            m('img', {src: self.productList[k].imgUrl}),
            m('p', [
                m('span.title', self.productList[k].title),
                m('br'),
                m('div.sku', chrome.i18n.getMessage('itemlabel') + k),
                m('div.sku', chrome.i18n.getMessage('modellabel') + self.productList[k].model)
            ])
        ])
        if ((i > 0) && (i % 4 == 0)) {
            results.push(row);
            row = [item];
        } else {
            row.push(item);
        }
    })
    results.push(row);
    return results
}

var ResultsApp = {};

ResultsApp.oninit = function () {
    var self = this;
    self.productList = {};
    self.currentBanner = '';
    chrome.storage.sync.get(null, function (items) {
        if ('productlist' in items) {
            self.productList = items['productlist'];
        }
        if ('currentbanner' in items) {
            self.currentBanner = items['currentbanner'];
        }
        m.redraw();
    });
}

ResultsApp.view = function () {
    var self = this;
    return m('div.container', [
        self.currentBanner ? m('div.header.col.centered.w100', m('img', {src: chrome.runtime.getURL('/assets/img/' + self.currentBanner)})) : '',
        Object.keys(self.productList).length > 0 ? gridify(self).map(function (o) {
            return m('div.row', o);
        }) : ''
    ]);
}

m.mount(document.getElementById('infresults'), ResultsApp);