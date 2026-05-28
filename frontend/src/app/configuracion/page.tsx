'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Users, Scale, FileText, MapPin, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import { GestionAbogados } from '@/components/configuracion/gestion-abogados'
import { GestionComplejidad } from '@/components/configuracion/gestion-complejidad'
import { GestionExtension } from '@/components/configuracion/gestion-extension'
import { GestionProcedencias } from '@/components/configuracion/gestion-procedencias'
import { GestionRevisores } from '@/components/configuracion/gestion-revisores'
import { useMe } from '@/lib/use-me'

export default function ConfiguracionPage() {
    const { isRegistrador } = useMe()
    const esRegistrador = isRegistrador('apelaciones')

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
                            <p className="text-muted-foreground">Gestión de catálogos y parámetros</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <Tabs defaultValue="abogados" className="space-y-6">
                    <TabsList className={`grid w-full ${esRegistrador ? 'grid-cols-3' : 'grid-cols-5'}`}>
                        <TabsTrigger value="abogados" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Abogados
                        </TabsTrigger>
                        <TabsTrigger value="procedencias" className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Procedencias
                        </TabsTrigger>
                        <TabsTrigger value="revisores" className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            Revisores
                        </TabsTrigger>
                        {!esRegistrador && (
                            <>
                                <TabsTrigger value="complejidad" className="flex items-center gap-2">
                                    <Scale className="h-4 w-4" />
                                    Complejidad
                                </TabsTrigger>
                                <TabsTrigger value="extension" className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Extensión
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>

                    <TabsContent value="abogados">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestión de Abogados</CardTitle>
                                <CardDescription>
                                    Administre los abogados que pueden ser asignados a las apelaciones
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GestionAbogados />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="procedencias">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestión de Procedencias</CardTitle>
                                <CardDescription>
                                    Administre las procedencias disponibles para el registro de apelaciones
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GestionProcedencias />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="revisores">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestión de Revisores</CardTitle>
                                <CardDescription>
                                    Administre los revisores disponibles para el registro de apelaciones
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GestionRevisores />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {!esRegistrador && (
                        <>
                            <TabsContent value="complejidad">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Gestión de Complejidad Jurídica</CardTitle>
                                        <CardDescription>
                                            Configure los tipos de complejidad y sus puntos asociados
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <GestionComplejidad />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="extension">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Gestión de Rangos de Extensión</CardTitle>
                                        <CardDescription>
                                            Configure los rangos de folios y sus puntos correspondientes
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <GestionExtension />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </main>
        </div>
    )
}
