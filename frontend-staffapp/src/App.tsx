import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';
import PromptList from './components/PromptList';
import PromptDetails from './components/PromptDetails';

function App() {
  return (
    <BrowserRouter>
      <Box minH="100vh" bg="gray.50">
        <Box bg="blue.600" color="white" py={6} mb={8}>
          <Container maxW="container.xl">
            <VStack align="start" spacing={2}>
              <Heading size="lg">SOW Prompt Manager</Heading>
              <Text fontSize="sm" opacity={0.9}>
                Manage analysis prompts and variables for Statement of Work processing
              </Text>
            </VStack>
          </Container>
        </Box>

        <Container maxW="container.xl" pb={12}>
          <Routes>
            <Route path="/" element={<Navigate to="/prompts" replace />} />
            <Route path="/prompts" element={<PromptList />} />
            <Route path="/prompts/:clauseId" element={<PromptDetails />} />
          </Routes>
        </Container>
      </Box>
    </BrowserRouter>
  );
}

export default App;
