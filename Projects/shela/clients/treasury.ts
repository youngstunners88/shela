import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { ShelaTreasury } from '../anchor/target/types/shela_treasury';

// Shela Treasury Client
// Interact with the escrow smart contract

const PROGRAM_ID = new web3.PublicKey('Treasury11111111111111111111111111111111111');

export class TreasuryClient {
  private program: Program<ShelaTreasury>;
  
  constructor(provider: AnchorProvider) {
    this.program = new Program(IDL, PROGRAM_ID, provider);
  }
  
  // Initialize a new escrow for a match
  async initializeEscrow(
    matchId: string,
    userA: web3.PublicKey,
    userB: web3.PublicKey,
    stakeAmount: number // in lamports
  ) {
    const [escrowPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    const [treasuryPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    return await this.program.methods
      .initializeEscrow(matchId, userA, userB, new BN(stakeAmount))
      .accounts({
        escrow: escrowPDA,
        treasuryAccount: treasuryPDA,
        initializer: this.program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
  }
  
  // User A stakes SOL
  async stakeUserA(matchId: string) {
    const [escrowPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    const [treasuryPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    return await this.program.methods
      .stakeUserA()
      .accounts({
        escrow: escrowPDA,
        treasuryAccount: treasuryPDA,
        user: this.program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
  }
  
  // User B stakes SOL
  async stakeUserB(matchId: string) {
    const [escrowPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    const [treasuryPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    return await this.program.methods
      .stakeUserB()
      .accounts({
        escrow: escrowPDA,
        treasuryAccount: treasuryPDA,
        user: this.program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
  }
  
  // Verify meet and release stakes (called by oracle)
  async verifyAndRelease(
    matchId: string,
    userA: web3.PublicKey,
    userB: web3.PublicKey,
    userAProof: Uint8Array,
    userBProof: Uint8Array
  ) {
    const [escrowPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    const [treasuryPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    return await this.program.methods
      .verifyAndRelease(Array.from(userAProof), Array.from(userBProof))
      .accounts({
        escrow: escrowPDA,
        treasuryAccount: treasuryPDA,
        userA,
        userB,
        authority: this.program.provider.publicKey,
      })
      .rpc();
  }
  
  // Slash stake for violation (called by slash oracle)
  async slashNoShow(
    matchId: string,
    violator: web3.PublicKey,
    victim: web3.PublicKey,
    violationType: 'ghosted' | 'noShow' | 'inappropriateBehavior' | 'unsafeMeet' | 'harassment',
    slashPercentage: number
  ) {
    const [escrowPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    const [treasuryPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    const violationTypeMap: Record<string, any> = {
      ghosted: { ghosted: {} },
      noShow: { noShow: {} },
      inappropriateBehavior: { inappropriateBehavior: {} },
      unsafeMeet: { unsafeMeet: {} },
      harassment: { harassment: {} },
    };
    
    return await this.program.methods
      .slashNoShow(violationTypeMap[violationType], slashPercentage)
      .accounts({
        escrow: escrowPDA,
        treasuryAccount: treasuryPDA,
        violator,
        victim,
        authority: this.program.provider.publicKey,
      })
      .rpc();
  }
  
  // Fetch escrow account data
  async getEscrow(matchId: string) {
    const [escrowPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), Buffer.from(matchId)],
      PROGRAM_ID
    );
    
    return await this.program.account.escrowAccount.fetch(escrowPDA);
  }
}