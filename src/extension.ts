import * as vscode from 'vscode';
import { getAPIConfig, getAPIBaseURL, analyzeDocumentOnSave } from './config';
import { SuggestionWebView } from './providers/suggestion.provider';
import { RecommendationWebView } from './providers/recommendation.provider';
import { activateAnalyzeCommand } from './commands/anazlyzeDocument';
import { Util } from './utils';
import { createUserSession } from './helpers/createSession';
import { AnalyzeTextDocumentOnSave } from './helpers/analyzeTextDocumentOnSave';
import { AnalyzeCodeDocumentOnSave } from './helpers/analyzeCodeDocumentOnSave';

let sessionInterval: any | null = null;
export function activate(context: vscode.ExtensionContext) {
  const debug = vscode.window.createOutputChannel('Metabob-Debug');
  const apiConfig = getAPIConfig();
  const baseUrl = getAPIBaseURL();
  const analyzeDocumentOnSaveConfig = analyzeDocumentOnSave();

  const config = {
    apiConfig,
    baseUrl,
    analyzeDocumentOnSave: analyzeDocumentOnSaveConfig,
  };

  createUserSession(context);
  sessionInterval = setInterval(() => {
    createUserSession(context);
  }, 60_000);

  activateAnalyzeCommand(context, config, debug);

  if (analyzeDocumentOnSaveConfig && analyzeDocumentOnSaveConfig === true) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        if (Util.isValidDocument(document)) {
          if (Util.isTextDocument(document)) {
            AnalyzeTextDocumentOnSave({
              text: true,
              code: false,
              document,
            });
          } else {
            AnalyzeCodeDocumentOnSave({
              text: true,
              code: false,
              document,
            });
          }
        }
      })
    );
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
      if (e.affectsConfiguration('metabob.apiKey') === true) {
        vscode.window.showInformationMessage('Metabob: API Key Changed');
      }
      if (e.affectsConfiguration('metabob.baseURl') === true) {
        vscode.window.showInformationMessage('Metabob: Base URL Changed');
      }
    })
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'suggestion-panel-webview',
      new SuggestionWebView(context?.extensionUri)
    )
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'recommendation-panel-webview',
      new RecommendationWebView(context?.extensionUri)
    )
  );
}

export function deactivate() {
  if (sessionInterval) {
    clearInterval(sessionInterval);
  }
}
