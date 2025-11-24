import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
  Badge,
  Divider,
  Code,
  useToast,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { promptApi } from '../services/api';
import VariableEditor from './VariableEditor';

export default function PromptDetails() {
  const { clauseId } = useParams<{ clauseId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: promptData, isLoading: promptLoading } = useQuery({
    queryKey: ['prompt', clauseId],
    queryFn: () => promptApi.getPrompt(clauseId!),
    enabled: !!clauseId,
  });

  const { data: variablesData, isLoading: variablesLoading, refetch: refetchVariables } = useQuery({
    queryKey: ['variables', clauseId],
    queryFn: () => promptApi.getVariables(clauseId!),
    enabled: !!clauseId,
  });

  if (promptLoading || variablesLoading) {
    return (
      <VStack py={12}>
        <Spinner size="xl" color="blue.500" />
        <Text color="gray.600">Loading prompt details...</Text>
      </VStack>
    );
  }

  const prompt = promptData?.prompt;
  
  // Convert variables object to array format
  const variablesObject = variablesData?.variables || {};
  const variables = Object.entries(variablesObject).map(([key, value], index) => ({
    id: index,
    variable_name: key,
    variable_value: value as string,
    description: undefined,
  }));

  return (
    <VStack spacing={6} align="stretch">
      <Button
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        alignSelf="start"
        onClick={() => navigate('/prompts')}
      >
        Back to Prompts
      </Button>

      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <HStack>
                <Heading size="md">Clause ID: {clauseId}</Heading>
                <Badge colorScheme="green">Active</Badge>
              </HStack>
            </VStack>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={4}>
            <Box>
              <Text fontWeight="semibold" mb={2}>
                Prompt Text:
              </Text>
              <Code
                display="block"
                whiteSpace="pre-wrap"
                p={4}
                borderRadius="md"
                fontSize="sm"
                bg="gray.50"
                maxH="400px"
                overflowY="auto"
              >
                {prompt}
              </Code>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Heading size="md">Variables ({variables.length})</Heading>
        </CardHeader>
        <Divider />
        <CardBody>
          <VariableEditor
            clauseId={clauseId!}
            variables={variables}
            onUpdate={() => {
              refetchVariables();
              toast({
                title: 'Variables updated',
                status: 'success',
                duration: 2000,
              });
            }}
          />
        </CardBody>
      </Card>
    </VStack>
  );
}
