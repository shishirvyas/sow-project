import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon } from '@chakra-ui/icons';
import { promptApi } from '../services/api';
import CreatePromptModal from './CreatePromptModal';

export default function PromptList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['prompts'],
    queryFn: promptApi.listPrompts,
  });

  const prompts = data?.prompts || [];
  const filteredPrompts = prompts.filter((promptId: string) =>
    promptId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSuccess = () => {
    refetch();
    setIsCreateModalOpen(false);
    toast({
      title: 'Prompt created',
      description: 'New prompt has been created successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  if (isLoading) {
    return (
      <VStack py={12}>
        <Spinner size="xl" color="blue.500" />
        <Text color="gray.600">Loading prompts...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Heading size="md">All Prompts ({filteredPrompts.length})</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create Prompt
        </Button>
      </HStack>

      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Search prompts by clause ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          bg="white"
        />
      </InputGroup>

      {filteredPrompts.length === 0 ? (
        <Card>
          <CardBody>
            <VStack py={8} spacing={3}>
              <Text color="gray.500" fontSize="lg">
                {searchTerm ? 'No prompts found' : 'No prompts available'}
              </Text>
              <Text color="gray.400" fontSize="sm">
                {searchTerm ? 'Try a different search term' : 'Create your first prompt to get started'}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filteredPrompts.map((clauseId: string) => (
            <Card
              key={clauseId}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
              onClick={() => navigate(`/prompts/${clauseId}`)}
            >
              <CardBody>
                <VStack align="start" spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Badge colorScheme="blue" fontSize="xs">
                      {clauseId}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    Click to view details and manage variables
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <CreatePromptModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </VStack>
  );
}
