// mock-repo/auth-service.ts

export interface User {
  id: string;
  name: string;
  role: string;
}

export class AuthService {
  private users: User[] = [
    { id: "1", name: "Rahul", role: "admin" },
    { id: "2", name: "Amit", role: "developer" }
  ];

  public executeLogin(userId: string): { success: boolean; sessionToken: string } {
    const user = this.users.find(u => u.id === userId);
    
    if (!user) {
      throw new Error("Authentication failed: User target not located in registry.");
    }

    console.log(`[Auth]: Logging in user: ${user.name}`);
    
    // FIX: Declare and assign a value to the sessionToken variable.
    // For a real application, this would involve generating a cryptographically secure token.
    const sessionToken = `mock-session-token-${user.id}-${Date.now()}`;

    return {
      success: true,
      sessionToken: sessionToken 
    };
  }
}