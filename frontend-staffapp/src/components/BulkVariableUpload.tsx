import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  Textarea,
  useToast,
  Text,
  Code,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { promptApi } from '../services/api';
import type { CreateVariableData } from '../types/prompt.types';

interface BulkVariableUploadProps {
  isOpen: boolean;
  onClose: () => void;
  clauseId: string;
  onSuccess: () => void;
}

export default function BulkVariableUpload({
  isOpen,
  onClose,
  clauseId,
  onSuccess,
}: BulkVariableUploadProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [parseError, setParseError] = useState('');
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (variables: CreateVariableData[]) =>
      promptApi.bulkAddVariables(clauseId, { variables }),
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Added ${data.count} variables successfully`,
        status: 'success',
        duration: 3000,
      });
      setJsonInput('');
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add variables',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const handleSubmit = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Validate structure
      if (!Array.isArray(parsed)) {
        setParseError('Input must be an array of variables');
        return;
      }

      const variables = parsed.map((item: any) => {
        if (!item.variable_name || !item.variable_value) {
          throw new Error('Each variable must have variable_name and variable_value');
        }
        return {
          variable_name: item.variable_name,
          variable_value: item.variable_value,
          description: item.description || undefined,
        };
      });

      setParseError('');
      mutation.mutate(variables);
    } catch (error: any) {
      setParseError(error.message);
    }
  };

  const handleClose = () => {
    setJsonInput('');
    setParseError('');
    onClose();
  };

  const exampleJson = `[
  {
    "variable_name": "supplier_name",
    "variable_value": "Acme Corp",
    "description": "Name of the supplier"
  },
  {
    "variable_name": "contract_date",
    "variable_value": "2025-01-01"
  }
]`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Bulk Upload Variables</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Paste a JSON array of variables to add multiple at once.
            </Text>

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1} fontSize="sm">
                <Text fontWeight="semibold">Example format:</Text>
                <Code display="block" whiteSpace="pre" fontSize="xs" p={2}>
                  {exampleJson}
                </Code>
              </VStack>
            </Alert>

            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste JSON array here..."
              rows={12}
              fontFamily="monospace"
              fontSize="sm"
            />

            {parseError && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">{parseError}</Text>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={mutation.isPending}
            isDisabled={!jsonInput.trim()}
          >
            Upload Variables
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
