const downloadJson = (jsonContent) => {
  try {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = 'localStorage.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.log(error);
    alert("Erro ao baixar o arquivo");
  }
};

const loadingButton = (button) => { 
  const $button = button;
  const loadingText = '<i class="fa fa-circle-o-notch fa-spin"></i> Carregando...';
  if (button.html() !== loadingText) {
    $button.data('original-text', button.html());
    $button.prop("disabled", true);
    $button.html(loadingText);
  }
  setTimeout(function() {
    $button.html($button.data('original-text'));
    $button.prop("disabled", false);
  }, 3000);
}

const getCurrentTab = async () => { 
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (tab?.url?.includes('chrome://')) {
    alert("Não é possível executar em páginas do Chrome");
    return;
  }
  
  return tab;
}

const exportLocalStorage = async (loadingCallback) => {
  const tab = await getCurrentTab();
  if (!tab) return;
  
  loadingCallback();

  let localStorageItems = {};
  try {
    const fromPageLocalStore = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return JSON.stringify(localStorage);
      },
    });

    localStorageItems = fromPageLocalStore[0]?.result || '{}';
  } catch (error) {
    console.log(error);
    alert("Erro ao capturar o localStorage para exportar");
  }

  downloadJson(localStorageItems);
};

const importLocalStorage = async (loadingCallback) => { 
  const inputFile = $("#campo-json");
  const fileUpload = inputFile.prop('files')[0];

  if (!fileUpload) {
    alert("Nenhum arquivo para importar");
    return;
  }

  const tab = await getCurrentTab();
  if (!tab) return;

  loadingCallback();

  const reader = new FileReader();
  reader.onload = async function (e) {
    const jsonContent = e.target.result;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (args) => {
          try {
            const jsonLocalStorage = JSON.parse(args || '{}', null, 2);
            const objEntries = Object.entries(jsonLocalStorage);
            objEntries.forEach(([key, value]) => {
              const newValue = value instanceof Object ? JSON.stringify(value) : value;
              localStorage.setItem(key, newValue);
            });
          } catch (error) {
            console.log(error);
            alert("Erro ao importar o localStorage", error);
          }
        },
        args: [jsonContent]
      });
    } catch (error) {
      console.log(error);
      alert("Erro ao capturar o localStorage para importar");
    }
  };

  reader.readAsText(fileUpload);
};


$(document).ready(() => {
  $("#grupo-importar").hide();

  $('#botao-exportar').on('click', function() {
    exportLocalStorage(() => loadingButton($(this)));
  });

  $('#botao-importar').on('click', function () {
    importLocalStorage(() => loadingButton($(this)));
  });

});

$(".toggler-operacoes input[type='radio']").change(function() {
  const groupId = $(this).attr('id') === 'operacao_exportar' ? 'grupo-exportar' : 'grupo-importar';

  $("#grupo-exportar, #grupo-importar").hide();
  
  $("#" + groupId).show();
});
