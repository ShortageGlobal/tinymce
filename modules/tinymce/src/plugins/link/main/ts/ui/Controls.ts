import { Fun, Optional } from '@ephox/katamari';

import Editor from 'tinymce/core/api/Editor';
import { InlineContent } from 'tinymce/core/api/ui/Ui';

import * as Options from '../api/Options';
import * as Actions from '../core/Actions';
import * as Utils from '../core/Utils';

const setupButtons = (editor: Editor): void => {
  editor.ui.registry.addToggleButton('link', {
    icon: 'link',
    tooltip: 'Insert/edit link',
    onAction: Actions.openDialog(editor),
    onSetup: Actions.toggleActiveState(editor)
  });

  editor.ui.registry.addButton('openlink', {
    icon: 'new-tab',
    tooltip: 'Open link',
    onAction: Actions.gotoSelectedLink(editor),
    onSetup: Actions.toggleEnabledState(editor)
  });

  editor.ui.registry.addButton('unlink', {
    icon: 'unlink',
    tooltip: 'Remove link',
    onAction: () => Utils.unlink(editor),
    onSetup: Actions.toggleUnlinkState(editor)
  });
};

const setupMenuItems = (editor: Editor): void => {
  editor.ui.registry.addMenuItem('openlink', {
    text: 'Open link',
    icon: 'new-tab',
    onAction: Actions.gotoSelectedLink(editor),
    onSetup: Actions.toggleEnabledState(editor)
  });

  editor.ui.registry.addMenuItem('link', {
    icon: 'link',
    text: 'Link...',
    shortcut: 'Meta+K',
    onAction: Actions.openDialog(editor)
  });

  editor.ui.registry.addMenuItem('unlink', {
    icon: 'unlink',
    text: 'Remove link',
    onAction: () => Utils.unlink(editor),
    onSetup: Actions.toggleUnlinkState(editor)
  });
};

const setupContextMenu = (editor: Editor): void => {
  const inLink = 'link unlink openlink';
  const noLink = 'link';
  editor.ui.registry.addContextMenu('link', {
    update: (element) => {
      const isEditable = editor.dom.isEditable(element);
      if (!isEditable) {
        return '';
      }

      return Utils.hasLinks(editor.dom.getParents(element, 'a') as HTMLAnchorElement[]) ? inLink : noLink;
    }
  });
};

const setupContextToolbars = (editor: Editor): void => {
  const collapseSelectionToEnd = (editor: Editor) => {
    editor.selection.collapse(false);
  };

  const onSetupLink = (buttonApi: InlineContent.ContextFormButtonInstanceApi) => {
    const node = editor.selection.getNode();
    buttonApi.setEnabled(Utils.isInAnchor(editor, node));
    return Fun.noop;
  };

  /*
   * if we're editing a link, don't change the text.
   * if anything other than text is selected, don't change the text.
   */
  const getLinkText = (value: string) => {
    const anchor = Utils.getAnchorElement(editor);
    const onlyText = Utils.isOnlyTextSelected(editor);
    if (anchor.isNone() && onlyText) {
      const text = Utils.getAnchorText(editor.selection, anchor);
      return Optional.some(text.length > 0 ? text : value);
    } else {
      return Optional.none();
    }
  };

  editor.ui.registry.addContextForm('quicklink', {
    launch: {
      type: 'contextformtogglebutton',
      icon: 'link',
      tooltip: 'Link',
      onSetup: Actions.toggleActiveState(editor)
    },
    label: 'Link',
    predicate: (node) => Options.hasContextToolbar(editor) && Utils.isInAnchor(editor, node),
    initValue: () => {
      const elm = Utils.getAnchorElement(editor);
      return elm.fold(Fun.constant(''), Utils.getHref);
    },
    commands: [
      {
        type: 'contextformtogglebutton',
        icon: 'link',
        tooltip: 'Link',
        primary: true,
        onSetup: (buttonApi) => {
          const node = editor.selection.getNode();
          // TODO: Make a test for this later.
          buttonApi.setActive(Utils.isInAnchor(editor, node));
          return Actions.toggleActiveState(editor)(buttonApi);
        },
        onAction: (formApi) => {
          const value = formApi.getValue();
          const text = getLinkText(value);
          const attachState = { href: value, attach: Fun.noop };
          Utils.link(editor, attachState, {
            href: value,
            text,
            title: Optional.none(),
            rel: Optional.none(),
            target: Optional.none(),
            class: Optional.none()
          });
          collapseSelectionToEnd(editor);
          formApi.hide();
        }
      },
      {
        type: 'contextformbutton',
        icon: 'unlink',
        tooltip: 'Remove link',
        onSetup: onSetupLink,
        // TODO: The original inlite action was quite complex. Are we missing something with this?
        onAction: (formApi) => {
          Utils.unlink(editor);
          formApi.hide();
        }
      },
      {
        type: 'contextformbutton',
        icon: 'new-tab',
        tooltip: 'Open link',
        onSetup: onSetupLink,
        onAction: (formApi) => {
          Actions.gotoSelectedLink(editor)();
          formApi.hide();
        }
      }
    ]
  });
};

export {
  setupButtons,
  setupMenuItems,
  setupContextMenu,
  setupContextToolbars
};
