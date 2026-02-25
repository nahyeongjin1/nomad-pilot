import { Column, DeleteDateColumn, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Trip } from '../../trips/entities/trip.entity.js';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'varchar', length: 100 })
  nickname!: string;

  @DeleteDateColumn()
  deletedAt!: Date | null;

  @OneToMany(() => Trip, (trip) => trip.user)
  trips!: Trip[];
}
