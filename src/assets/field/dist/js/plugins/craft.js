(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = function (root, jQuery) {
            if (jQuery === undefined) {
                // require('jQuery') returns a factory that requires window to
                // build a jQuery instance, we normalize how we use modules
                // that require this pattern but the window provided is a noop
                // if it's defined (how jquery works)
                if (typeof window !== 'undefined') {
                    jQuery = require('jquery');
                }
                else {
                    jQuery = require('jquery')(root);
                }
            }
            return factory(jQuery);
        };
    } else {
        // Browser globals
        factory(window.jQuery);
    }
}(function ($) {

    $.extend($.FE.DEFAULTS, {
        // general
        craftElementSiteId: false,
        craftAssetElementType: false,
        craftAssetElementRefHandle: false,
        // links
        craftLinkCriteria: false,
        craftLinkSources: [],
        craftLinkStorageKey: false,
        craftLinkElementType: false,
        craftLinkElementRefHandle: false,
        // images
        craftImageCriteria: false,
        craftImageSources: [],
        craftImageStorageKey: false,
        craftImageTransforms: [],
        // files
        craftFileCriteria: false,
        craftFileSources: [],
        craftFileStorageKey: false
    });

    $.FE.PLUGINS.craft = function (editor) {

        function showEntrySelectModal() {
            var $popup = editor.popups.get('link.insert'),
                selectedText = (editor.selection.text() || false);

            // save selection before modal is shown
            editor.selection.save();

            _elementModal(
                editor.opts.craftLinkElementType,
                editor.opts.craftLinkStorageKey,
                editor.opts.craftLinkSources,
                editor.opts.craftLinkCriteria,
                [],
                function(elements) {
                    // re-focus the popup
                    if (!editor.popups.isVisible('link.insert')) {
                        editor.popups.show('link.insert');
                    }

                    // add-in element link details
                    if (elements.length) {
                        var element = elements[0],
                            url = element.url + '#' + editor.opts.craftLinkElementRefHandle + ':' + element.id,
                            title = selectedText.length > 0 ? selectedText : element.label;

                        $popup.find('input[name="href"]').val(url);
                        $popup.find('input[name="text"]').val(title);
                    }

                    editor.accessibility.focusPopup($popup);
                }
            );
        }

        function showImageInsertModal() {
            // save selection before modal is shown
            editor.selection.save();

            _elementModal(
                editor.opts.craftAssetElementType,
                editor.opts.craftImageStorageKey,
                editor.opts.craftImageSources,
                editor.opts.craftImageCriteria,
                [],
                function(assets, transform) {
                    if (assets.length) {
                        for (var i = 0; i < assets.length; i++) {
                            var asset = assets[i],
                                url = asset.url + '#' + editor.opts.craftAssetElementRefHandle + ':' + asset.id;

                            if (transform) {
                                url += ':' + transform;
                            }

                            editor.image.insert(url, false, { 'asset-id': asset.id });
                        }

                        return true;
                    }
                }
            );
        }

        function showImageReplaceModal() {
            var disabledElementIds = [],
                $currentImage = editor.image.get();

            // find out the current asset id based on data-attribute
            if ($currentImage.data('assetId')) {
                disabledElementIds.push($currentImage.data('assetId'));
            } else if ($currentImage.attr('src').indexOf('#') !== -1) {

                // otherwise check the src url containing '#asset:{id}[:{transform}]'
                var hashValue = $currentImage.attr('src').substr($currentImage.attr('src').indexOf('#'));
                hashValue = decodeURIComponent(hashValue);

                if (hashValue.indexOf(':') !== -1) {
                    disabledElementIds.push(hashValue.split(':')[1]);
                }
            }

            _elementModal(
                editor.opts.craftAssetElementType,
                editor.opts.craftImageStorageKey,
                editor.opts.craftImageSources,
                editor.opts.craftImageCriteria,
                disabledElementIds,
                function(assets, transform) {
                    if (assets.length) {
                        for (var i = 0; i < assets.length; i++) {
                            var asset = assets[i],
                                url = asset.url + '#asset:' + asset.id;

                            if (transform) {
                                url += ':' + transform;
                            }

                            editor.image.insert(url, false, { 'asset-id': asset.id }, $currentImage);
                        }

                        return true;
                    }
                }
            );
        }

        function showFileInsertModal() {
            // save selection before modal is shown
            editor.selection.save();

            var selectedText = (editor.selection.text() || false);

            _elementModal(
                editor.opts.craftAssetElementType,
                editor.opts.craftFileStorageKey,
                editor.opts.craftFileSources,
                editor.opts.craftFileCriteria,
                [],
                function(elements) {
                    if (elements.length) {
                        var element = elements[0],
                            url = element.url + '#' + editor.opts.craftLinkElementRefHandle + ':' + element.id,
                            title = selectedText.length > 0 ? selectedText : element.label;

                        editor.link.insert(url, title);

                        return true;
                    }
                }
            );
        }

        function _elementModal(type, storageKey, sources, criteria, disabled, callback) {

            var modal = Craft.createElementSelectorModal(type, {
                storageKey: (storageKey || 'Froala.Craft.Modal.' + type),
                sources: sources,
                criteria: $.extend({ siteId: editor.opts.craftElementSiteId }, criteria),
                disabledElementIds: disabled,
                onSelect: $.proxy(callback, editor),
                closeOtherModals: false
            });
        }

        return {
            showEntrySelectModal: showEntrySelectModal,
            showImageInsertModal: showImageInsertModal,
            showImageReplaceModal: showImageReplaceModal,
            showFileInsertModal: showFileInsertModal
        }
    };

    /*
        LINK REPLACEMENTS & ADDITIONS
     */

    $.FE.DefineIcon('craftLinkEntry', { NAME: 'newspaper-o' });
    $.FE.RegisterCommand('craftLinkEntry', {
        title: 'Link to Craft Entry',
        undo: false,
        focus: true,
        refreshOnCallback: false,
        popup: true,
        callback: function () {
            this.craft.showEntrySelectModal();
        }
    });

    $.extend($.FE.DEFAULTS, {
        linkInsertButtons: ['craftLinkEntry']
    });

    /*
        IMAGE REPLACEMENTS & ADDITIONS
     */

    $.FE.RegisterCommand('insertImage', $.extend($.FE.COMMANDS['insertImage'], {
        callback: function (cmd, val) {
            this.craft.showImageInsertModal();
        }
    }));

    $.FE.RegisterCommand('imageReplace', $.extend($.FE.COMMANDS['imageReplace'], {
        callback: function(cmd, val) {
            this.craft.showImageReplaceModal();
        }
    }));

    /*
        FILE REPLACEMENTS & ADDITIONS
     */

    $.FE.RegisterCommand('insertFile', $.extend($.FE.COMMANDS['insertFile'], {
        callback: function (cmd, val) {
            this.craft.showFileInsertModal();
        }
    }));

}));