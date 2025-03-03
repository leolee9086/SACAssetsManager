import SButton from './components/SButton.vue';
import SDialog from './components/SDialog.vue';
import STextField from './components/STextField.vue';
import STextArea from './components/STextArea.vue';
import SMenu from './components/SMenu.vue';
import SList from './components/SList.vue';
import SListItem from './components/SListItem.vue';
import SMenuSeparator from './components/SMenuSeparator.vue';
import SMessage from './components/SMessage.vue';

export {
  SButton,
  SDialog,
  STextField,
  STextArea,
  SMenu,
  SList,
  SListItem,
  SMenuSeparator,
  SMessage
};

export default {
  install(app) {
    app.component('SButton', SButton);
    app.component('SDialog', SDialog);
    app.component('STextField', STextField);
    app.component('STextArea', STextArea);
    app.component('SMenu', SMenu);
    app.component('SList', SList);
    app.component('SListItem', SListItem);
    app.component('SMenuSeparator', SMenuSeparator);
    app.component('SMessage', SMessage);
  }
};