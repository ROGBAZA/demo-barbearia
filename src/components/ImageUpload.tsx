import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
    currentImage?: string;
    onImageUploaded: (url: string) => void;
    bucket: string;
    folder: string;
    label: string;
    aspectRatio?: string;
}

export function ImageUpload({
    currentImage,
    onImageUploaded,
    bucket,
    folder,
    label,
    aspectRatio = "16/9"
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | undefined>(currentImage);
    const [urlInput, setUrlInput] = useState('');
    // const [showUrlInput, setShowUrlInput] = useState(false); // Removed unused state
    const { toast } = useToast();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({ title: 'Erro', description: 'Por favor, selecione uma imagem', variant: 'destructive' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'Erro', description: 'Imagem muito grande (máx 5MB)', variant: 'destructive' });
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${Date.now()}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            setPreview(publicUrl);
            onImageUploaded(publicUrl);
            toast({ title: 'Sucesso', description: 'Imagem enviada com sucesso!' });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
        } finally {
            setUploading(false);
        }
    };

    const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

    const handleUrlApply = () => {
        if (!urlInput.trim()) return;
        setPreview(urlInput);
        onImageUploaded(urlInput);
        setUploadMode('file'); // Volta para visualização
        toast({ title: 'Sucesso', description: 'Link de imagem aplicado!' });
    };

    const handleRemove = () => {
        setPreview(undefined);
        onImageUploaded('');
        setUrlInput('');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white uppercase tracking-widest">{label}</label>
                <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                        type="button"
                        onClick={() => setUploadMode('file')}
                        className={`px-3 py-1 rounded-md text-[10px] uppercase font-black tracking-wider transition-all ${uploadMode === 'file' ? 'bg-primary text-black shadow-gold' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Upload
                    </button>
                    <button
                        type="button"
                        onClick={() => setUploadMode('url')}
                        className={`px-3 py-1 rounded-md text-[10px] uppercase font-black tracking-wider transition-all ${uploadMode === 'url' ? 'bg-primary text-black shadow-gold' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Link
                    </button>
                </div>
            </div>

            {uploadMode === 'url' ? (
                <div className="space-y-4 p-6 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 animate-in fade-in zoom-in-95 duration-300" style={{ aspectRatio }}>
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <div className="w-full space-y-3">
                            <label className="text-[10px] text-zinc-400 uppercase font-black text-center block">Cole a URL da imagem</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://imgur.com/..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-primary transition-colors"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleUrlApply}
                                    className="bg-primary text-black font-black uppercase text-[10px] shadow-gold hover:shadow-primary/20"
                                >
                                    Aplicar
                                </Button>
                            </div>
                            <p className="text-[9px] text-zinc-600 text-center">Certifique-se que o link termina em .jpg ou .png</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className="relative rounded-2xl border-2 border-dashed border-white/10 overflow-hidden bg-white/5 hover:bg-white/10 transition-all group"
                    style={{ aspectRatio }}
                >
                    {preview ? (
                        <>
                            <img src={preview} alt={label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleRemove}
                                    className="rounded-xl"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Remover
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`upload-${label.replace(/\s+/g, '-').toLowerCase()}`)?.click()}
                                    className="rounded-xl"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Trocar
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div
                            className="h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer bg-gradient-to-br from-zinc-900/80 to-black hover:from-zinc-800 hover:to-zinc-900 transition-all duration-500 group-hover:scale-[1.02]"
                            onClick={() => document.getElementById(`upload-${label.replace(/\s+/g, '-').toLowerCase()}`)?.click()}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                                    <p className="text-sm text-muted-foreground">Enviando...</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-sm font-bold text-white mb-2">Clique para enviar</p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG até 5MB</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            <input
                id={`upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
            />
        </div>
    );
}
