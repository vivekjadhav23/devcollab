export default function detectLanguage(filename) {
  if (!filename) return 'javascript';
  const ext = filename.split('.').pop().toLowerCase();
  
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'cpp':
    case 'cc':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'java':
      return 'java';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'css':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    default:
      return 'plaintext';
  }
}
