import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('pt_sessions')
export class PtSession {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    sessions: number;

    @Column()
    priceCents: number;

    @Column({
        default: 'egp'
    })
    currency: string;

    @CreateDateColumn()
    createdAt: Date;

}