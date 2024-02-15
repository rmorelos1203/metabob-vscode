import * as vscode from 'vscode';
import { Result } from 'rusty-result-ts';
import { submitService, SubmitRepresentationResponse, ApiErrorBase } from '../services/';
import { IDocumentMetaData } from '../types';
import { AnalyzeState, Analyze, AnalyseMetaData } from '../state';
import Util from '../utils';
import CONSTANTS from '../constants';
import { getExtensionEventEmitter } from '../events';
import debugChannel from '../debug';

const failedResponseReturn: SubmitRepresentationResponse = { jobId: '', status: 'failed' };

export const verifyResponseOfSubmit = (
  response: Result<SubmitRepresentationResponse | null, ApiErrorBase>,
) => {
  if (response.isErr()) {
    return undefined;
  }

  if (response.isOk()) {
    return response.value !== null ? response.value : undefined;
  }

  return undefined;
};

export const handleDocumentAnalyze = async (
  metaDataDocument: IDocumentMetaData,
  sessionToken: string,
  analyzeState: Analyze,
  jobId?: string,
  suppressRateLimitErrors = false,
) => {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.fileName !== metaDataDocument.filePath) {
    getExtensionEventEmitter().fire({
      type: 'Analysis_Error',
      data: '',
    });

    return failedResponseReturn;
  }

  const response =
    jobId !== undefined
      ? await submitService.getJobStatus(sessionToken, jobId)
      : await submitService.submitTextFile(
        metaDataDocument.relativePath,
        metaDataDocument.fileContent,
        metaDataDocument.filePath,
        sessionToken,
      );

  const verifiedResponse = verifyResponseOfSubmit(response);
  if (!verifiedResponse || !verifiedResponse.results) {
    if (!suppressRateLimitErrors) {
      getExtensionEventEmitter().fire({
        type: 'Analysis_Error',
        data: '',
      });
      vscode.window.showErrorMessage(CONSTANTS.analyzeCommandTimeoutMessage);
    }
    getExtensionEventEmitter().fire({
      type: 'Analysis_Error',
      data: '',
    });
    vscode.window.showErrorMessage(CONSTANTS.analyzeCommandErrorMessage);
    return failedResponseReturn;
  } else if (verifiedResponse.status === 'failed') {
    getExtensionEventEmitter().fire({
      type: 'Analysis_Error',
      data: '',
    });
    vscode.window.showErrorMessage(CONSTANTS.analyzeCommandErrorMessage);

    return failedResponseReturn;
  }

  // If the response is pending or running, return verified response early
  if (verifiedResponse.status !== 'complete') {
    return verifiedResponse;
  }

  // collect all the problems and add them to the state as separate keys
  const analyseStateValue = analyzeState.get()?.value;

  if (!analyseStateValue) {
    getExtensionEventEmitter().fire({
      type: 'Analysis_Error',
      data: '',
    });
    vscode.window.showErrorMessage(CONSTANTS.analyzeCommandErrorMessage);
    return failedResponseReturn
  }

  const results: AnalyzeState = { ...analyseStateValue };

  verifiedResponse.results.forEach(problem => {
    const key = `${problem.path}@@${problem.id}`;
    const analyzeMetaData: AnalyseMetaData = {
      ...problem,
      isDiscarded: problem.discarded,
      isEndorsed: problem.endorsed,
      isViewed: false,
    }
    results[key] = { ...analyzeMetaData }
  });

  analyzeState.set(results);

  const decorationFromResponse = Util.transformResponseToDecorations(
    verifiedResponse.results,
    editor,
    jobId,
  );
  editor.setDecorations(decorationFromResponse.decorationType, []);
  editor.setDecorations(decorationFromResponse.decorationType, decorationFromResponse.decorations);

  getExtensionEventEmitter().fire({
    type: 'Analysis_Completed',
    data: results,
  });

  return verifiedResponse;
};
