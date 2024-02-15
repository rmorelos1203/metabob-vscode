import { useRecoilValue } from 'recoil';
import { Box, CircularProgress, useTheme } from '@mui/material';
import Button from '@mui/material/Button';
import { ProblemList } from './ProblemList';
import { AnalyzePageBodyContainer } from './styles';
import * as State from '../../state';
import { useMemo } from 'react';

interface AnalyzeProps {
  hasWorkSpaceFolders: boolean;
  hasOpenTextDocuments: boolean;
  isAnalysisLoading: boolean;
  handleAnalyzeClick: React.MouseEventHandler<HTMLButtonElement>;
}

export const AnalyzePage = ({
  hasWorkSpaceFolders,
  hasOpenTextDocuments,
  isAnalysisLoading,
  handleAnalyzeClick,
}: AnalyzeProps): JSX.Element => {
  const theme = useTheme();

  const identifiedProblems = useRecoilValue(State.identifiedProblems);
  const currentEditor = useRecoilValue(State.currentEditor);

  const otherFileWithProblems: Array<{ name: string }> | undefined = useMemo(() => {
    if (!identifiedProblems) return undefined;

    if (!currentEditor) return undefined;

    const results: Array<{ name: string }> = Object.keys(identifiedProblems)
      .filter(problemKey => {
        const splitString: string | undefined = problemKey.split('@@')[0];
        if (splitString === undefined) return false;
        const isViewed = identifiedProblems[problemKey].isViewed || false;
        if (splitString !== currentEditor && isViewed === false) {
          return true;
        }

        return false;
      })
      .map(problemKey => {
        const problem = identifiedProblems[problemKey];

        return {
          name: problem.path,
        };
      });

    const uniqueFiles = Array.from(new Set(results.map(item => item.name)));

    return uniqueFiles.map(name => {
      return {
        name,
      };
    });
  }, [identifiedProblems, currentEditor]);

  const detectedProblems = useMemo(() => {
    if (!identifiedProblems) return undefined;

    if (!currentEditor) return undefined;

    return Object.keys(identifiedProblems).filter(problemKey => {
      const problem = identifiedProblems[problemKey];
      const splitString: string | undefined = problemKey.split('@@')[0];
      if (splitString === undefined) return false;
      if (splitString === currentEditor && problem.isDiscarded === false) {
        return true;
      }

      return false;
    }).length;
  }, [identifiedProblems, currentEditor]);

  return (
    <>
      <Box sx={AnalyzePageBodyContainer(theme)}>
        {(!hasWorkSpaceFolders || !hasOpenTextDocuments) && (
          <>
            <Button
              sx={{
                width: '100%',
              }}
              variant='contained'
              color='primary'
              disabled
            >
              Please open a project to analyze
            </Button>
          </>
        )}

        {hasWorkSpaceFolders && hasOpenTextDocuments && (
          <>
            <Button
              sx={{
                minWidth: '140px',
              }}
              variant='contained'
              color='primary'
              onClick={handleAnalyzeClick}
              disabled={isAnalysisLoading}
            >
              {isAnalysisLoading && (
                <CircularProgress
                  size={15}
                  sx={{
                    marginRight: '10px',
                    color: 'whitesmoke',
                  }}
                />
              )}
              Analyze
            </Button>
          </>
        )}
      </Box>

      {hasWorkSpaceFolders && hasOpenTextDocuments && (
        <ProblemList
          detectedProblems={detectedProblems}
          otherFileWithProblems={otherFileWithProblems}
        />
      )}
    </>
  );
};
