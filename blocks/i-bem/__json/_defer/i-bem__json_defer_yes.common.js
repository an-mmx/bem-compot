(function (JSON) {

    var buildWithNewCtxSync = JSON._ctx.prototype._buildWithNewCtx;

    JSON._ctx.prototype._buildWithNewCtx = function (params, pos, siblingsCount) {
        var parent = params._parent || this._params;

        if (parent && params && Vow.isPromise(params)) {
            this.defer(params.then(function (json) {
                if (pos === 1 && siblingsCount === 1) {
                    parent.content = json;
                } else {
                    parent[pos - 1] = json;
                }
            }, function (err) {
                return Vow.reject(err);
            }));
            this._fns = [];

            return null;
        } else {
            return buildWithNewCtxSync.apply(this, arguments);
        }
    };

}(BEM.JSON));

